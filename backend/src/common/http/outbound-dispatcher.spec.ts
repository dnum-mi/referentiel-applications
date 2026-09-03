import { Logger } from "@nestjs/common";
import { EnvHttpProxyAgent } from "undici";
import {
  createWarnThrottle,
  describeFetchError,
  describeProxyConfig,
  getOutboundDispatcher,
  maskProxyUrl,
  resetOutboundDispatcher,
} from "./outbound-dispatcher";

const PROXY_VARIABLES = [
  "http_proxy",
  "HTTP_PROXY",
  "https_proxy",
  "HTTPS_PROXY",
  "no_proxy",
  "NO_PROXY",
] as const;

describe("outbound-dispatcher", () => {
  describe("maskProxyUrl", () => {
    it("ne garde que l'hôte et le port, sans les identifiants", () => {
      expect(maskProxyUrl("http://user:s3cret@proxy.example:3128")).toBe(
        "proxy.example:3128",
      );
      expect(maskProxyUrl("http://proxydc-sil.dtct.minint.fr:3128/")).toBe(
        "proxydc-sil.dtct.minint.fr:3128",
      );
      expect(maskProxyUrl("https://proxy.example")).toBe("proxy.example");
    });

    it("signale une URL de proxy invalide sans la reproduire", () => {
      // Sans schéma, « proxy.example: » est lu comme protocole : undici la refuserait aussi.
      expect(maskProxyUrl("proxy.example:3128")).toBe(
        "(URL de proxy invalide)",
      );
      expect(maskProxyUrl("")).toBe("(URL de proxy invalide)");
    });
  });

  describe("describeProxyConfig", () => {
    it("annonce l'accès direct quand aucune variable proxy n'est définie", () => {
      expect(describeProxyConfig({})).toContain("accès direct");
      // Une variable vide vaut absence, comme pour undici.
      expect(describeProxyConfig({ HTTPS_PROXY: "" })).toContain(
        "accès direct",
      );
    });

    it("annonce le proxy retenu sans ses identifiants", () => {
      const line = describeProxyConfig({
        HTTP_PROXY: "http://user:s3cret@proxy.example:3128",
        HTTPS_PROXY: "http://user:s3cret@proxy.example:3128",
      });
      expect(line).toContain("via le proxy proxy.example:3128");
      expect(line).not.toContain("s3cret");
      expect(line).not.toContain("cibles");
    });

    it("suit la précédence d'undici : minuscules d'abord, HTTPS avant HTTP", () => {
      expect(
        describeProxyConfig({
          https_proxy: "http://lower:1",
          HTTPS_PROXY: "http://upper:2",
        }),
      ).toContain("lower:1");
      // HTTP_PROXY seul sert les deux types de cibles : une seule route à annoncer.
      expect(
        describeProxyConfig({ HTTP_PROXY: "http://http-only:3" }),
      ).toContain("via le proxy http-only:3");
      expect(
        describeProxyConfig({ HTTP_PROXY: "http://http-only:3" }),
      ).not.toContain("cibles");
    });

    it("distingue les routes HTTPS et HTTP quand elles diffèrent", () => {
      expect(
        describeProxyConfig({
          HTTP_PROXY: "http://http:3",
          HTTPS_PROXY: "http://https:4",
        }),
      ).toContain(
        "via le proxy https:4 pour les cibles HTTPS, http:3 pour les cibles HTTP",
      );
      // Sans HTTP_PROXY, undici envoie les cibles HTTP en direct : ne pas laisser
      // croire qu'une page de scan EcoIndex en http:// est relayée.
      expect(
        describeProxyConfig({ HTTPS_PROXY: "http://https-only:4" }),
      ).toContain(
        "via le proxy https-only:4 pour les cibles HTTPS, en accès direct pour les cibles HTTP",
      );
    });

    it("mentionne les exclusions NO_PROXY", () => {
      expect(
        describeProxyConfig({
          HTTP_PROXY: "http://proxy:3128",
          HTTPS_PROXY: "http://proxy:3128",
          NO_PROXY: "localhost,.minint.fr",
        }),
      ).toContain("« localhost,.minint.fr »");
      expect(
        describeProxyConfig({
          HTTPS_PROXY: "http://proxy:3128",
          NO_PROXY: "localhost",
        }),
      ).toContain("« localhost »");
    });

    it("signale une URL de proxy invalide dès l'annonce", () => {
      // L'annonce précède la construction du dispatcher, qui échouera : l'exploitant
      // lit ici la cause avant le premier warn.
      expect(
        describeProxyConfig({ HTTPS_PROXY: "proxy.example:3128" }),
      ).toContain("(URL de proxy invalide)");
    });
  });

  describe("describeFetchError", () => {
    it("reconnaît le dépassement du délai (AbortSignal.timeout)", () => {
      const timeout = Object.assign(new Error("The operation was aborted"), {
        name: "TimeoutError",
      });
      expect(describeFetchError(timeout)).toBe("délai dépassé");
    });

    it("remonte le code de la cause réseau enveloppée par undici", () => {
      const error = Object.assign(new TypeError("fetch failed"), {
        cause: Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:9"), {
          code: "ECONNREFUSED",
        }),
      });
      expect(describeFetchError(error)).toBe(
        "erreur réseau ECONNREFUSED (connect ECONNREFUSED 127.0.0.1:9)",
      );
    });

    it("se rabat sur le nom de la cause sans code, puis sur l'erreur elle-même", () => {
      const withCause = Object.assign(new TypeError("fetch failed"), {
        cause: new RangeError("boom"),
      });
      expect(describeFetchError(withCause)).toBe(
        "erreur réseau RangeError (boom)",
      );
      expect(describeFetchError(new SyntaxError("Unexpected token <"))).toBe(
        "SyntaxError : Unexpected token <",
      );
      expect(describeFetchError("boom")).toBe("erreur inattendue (boom)");
    });

    it("préfère le code d'une erreur sans cause à son nom générique", () => {
      // Ce que lève le constructeur d'EnvHttpProxyAgent sur une URL de proxy sans schéma.
      const invalidProxy = Object.assign(
        new Error(
          "Invalid URL protocol: the URL must start with `http:` or `https:`.",
        ),
        { name: "InvalidArgumentError", code: "UND_ERR_INVALID_ARG" },
      );
      expect(describeFetchError(invalidProxy)).toBe(
        "UND_ERR_INVALID_ARG : Invalid URL protocol: the URL must start with `http:` or `https:`.",
      );
    });

    it("nomme la redirection refusée par redirect: error plutôt qu'une erreur réseau", () => {
      // Forme exacte produite par undici : TypeError « fetch failed » dont la cause
      // est une Error(« unexpected redirect ») sans code.
      const redirected = Object.assign(new TypeError("fetch failed"), {
        cause: new Error("unexpected redirect"),
      });
      expect(describeFetchError(redirected)).toBe(
        "redirection refusée (l'URL cible doit être l'adresse finale, sans redirection)",
      );
    });
  });

  describe("createWarnThrottle", () => {
    it("laisse passer un avertissement par clé et par fenêtre", () => {
      const shouldWarn = createWarnThrottle(60_000);
      expect(shouldWarn("a", 0)).toBe(true);
      expect(shouldWarn("a", 59_999)).toBe(false);
      expect(shouldWarn("a", 60_000)).toBe(true);
      expect(shouldWarn("a", 60_001)).toBe(false);
    });

    it("traite les clés indépendamment", () => {
      const shouldWarn = createWarnThrottle(60_000);
      expect(shouldWarn("a", 0)).toBe(true);
      expect(shouldWarn("b", 1)).toBe(true);
      expect(shouldWarn("a", 2)).toBe(false);
      expect(shouldWarn("b", 2)).toBe(false);
    });
  });

  describe("getOutboundDispatcher", () => {
    // Aucun réseau : `EnvHttpProxyAgent` ne se connecte qu'à la première requête.
    const savedEnv = new Map<string, string | undefined>();
    let logSpy: jest.SpyInstance;
    let errorSpy: jest.SpyInstance;

    beforeEach(() => {
      for (const name of PROXY_VARIABLES) {
        savedEnv.set(name, process.env[name]);
        delete process.env[name];
      }
      resetOutboundDispatcher();
      logSpy = jest
        .spyOn(Logger.prototype, "log")
        .mockImplementation(() => undefined);
      errorSpy = jest
        .spyOn(Logger.prototype, "error")
        .mockImplementation(() => undefined);
    });

    afterEach(() => {
      for (const name of PROXY_VARIABLES) {
        const value = savedEnv.get(name);
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
      resetOutboundDispatcher();
      jest.restoreAllMocks();
    });

    it("construit le dispatcher une seule fois pour le processus", () => {
      const first = getOutboundDispatcher();
      expect(first).toBeInstanceOf(EnvHttpProxyAgent);
      expect(getOutboundDispatcher()).toBe(first);
    });

    it("annonce la configuration retenue une seule fois, identifiants masqués", () => {
      process.env.HTTPS_PROXY = "http://user:s3cret@proxy.example:3128";
      process.env.HTTP_PROXY = "http://user:s3cret@proxy.example:3128";
      getOutboundDispatcher();
      getOutboundDispatcher();
      expect(logSpy).toHaveBeenCalledTimes(1);
      const [line] = logSpy.mock.calls[0];
      expect(line).toContain("via le proxy proxy.example:3128");
      expect(line).not.toContain("s3cret");
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it("annonce l'accès direct quand aucune variable proxy n'est définie", () => {
      getOutboundDispatcher();
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy.mock.calls[0][0]).toContain("accès direct");
    });

    it("loggue une seule fois une URL de proxy inutilisable, puis relance l'erreur à chaque appel", () => {
      process.env.HTTPS_PROXY = "proxy.example:3128";
      expect(() => getOutboundDispatcher()).toThrow("Invalid URL protocol");
      expect(() => getOutboundDispatcher()).toThrow("Invalid URL protocol");
      // L'annonce précède l'erreur : l'exploitant lit la configuration retenue
      // avant la cause, et ni l'une ni l'autre ne se répètent à chaque appel.
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy.mock.calls[0][0]).toContain("(URL de proxy invalide)");
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy.mock.calls[0][0]).toContain("Proxy sortant inutilisable");
      expect(errorSpy.mock.calls[0][0]).toContain("UND_ERR_INVALID_ARG");
      expect(logSpy.mock.invocationCallOrder[0]).toBeLessThan(
        errorSpy.mock.invocationCallOrder[0],
      );
    });
  });
});
