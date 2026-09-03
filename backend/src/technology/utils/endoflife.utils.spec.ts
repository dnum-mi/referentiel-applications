import {
  type EndoflifeProduct,
  type EndoflifeRelease,
  buildProductIndex,
  createWarnThrottle,
  describeFetchError,
  describeProxyConfig,
  lookupProductSlug,
  maskProxyUrl,
  matchRelease,
  normalizeProductKey,
  parseEolDate,
  parseEolInfo,
  toEndoflifeProduct,
} from "./endoflife.utils";

const RELEASES: EndoflifeRelease[] = [
  {
    name: "26",
    isEol: false,
    eolFrom: "2029-04-30",
    isEoas: false,
    eoasFrom: "2027-10-27",
    latest: { name: "26.7.0" },
  },
  {
    name: "24",
    isEol: false,
    eolFrom: "2028-04-30",
    isEoas: false,
    eoasFrom: "2026-10-20",
    latest: { name: "24.5.0" },
  },
  { name: "20", isEol: false, eolFrom: "2026-04-30" },
  { name: "18", isEol: true, eolFrom: "2025-04-30" },
];

const CATALOG: EndoflifeProduct[] = [
  {
    name: "nodejs",
    label: "Node.js",
    category: "framework",
    aliases: ["node"],
  },
  {
    name: "postgresql",
    label: "PostgreSQL",
    category: "db",
    aliases: ["postgres"],
  },
  {
    name: "mssqlserver",
    label: "Microsoft SQL Server",
    category: "db",
    aliases: ["mssql", "sql-server"],
  },
  { name: "dotnet", label: ".NET", category: "framework", aliases: [] },
];

describe("endoflife.utils", () => {
  describe("normalizeProductKey", () => {
    it("normalise un nom libre en clé de comparaison", () => {
      expect(normalizeProductKey("Node.js")).toBe("nodejs");
      expect(normalizeProductKey("  SQL Server  ")).toBe("sqlserver");
      expect(normalizeProductKey(".NET")).toBe("net");
    });
  });

  describe("toEndoflifeProduct (mode dégradé sans catalogue)", () => {
    it("normalise un nom de produit en identifiant endoflife.date", () => {
      expect(toEndoflifeProduct("Node.js")).toBe("nodejs");
      expect(toEndoflifeProduct("PostgreSQL")).toBe("postgresql");
      expect(toEndoflifeProduct("  Vue.js  ")).toBe("vuejs");
    });

    it("applique la table d'alias produit → slug", () => {
      expect(toEndoflifeProduct("SQL Server")).toBe("mssqlserver");
      expect(toEndoflifeProduct(".NET")).toBe("dotnet");
      expect(toEndoflifeProduct(".NET Core")).toBe("dotnet");
      expect(toEndoflifeProduct("Postgres")).toBe("postgresql");
    });
  });

  describe("buildProductIndex / lookupProductSlug", () => {
    const index = buildProductIndex(CATALOG);

    it("résout un produit par son slug, son label ou un alias officiel", () => {
      expect(lookupProductSlug(index, "nodejs")).toBe("nodejs");
      expect(lookupProductSlug(index, "Node.js")).toBe("nodejs");
      expect(lookupProductSlug(index, "node")).toBe("nodejs");
      expect(lookupProductSlug(index, "Microsoft SQL Server")).toBe(
        "mssqlserver",
      );
      expect(lookupProductSlug(index, "sql-server")).toBe("mssqlserver");
    });

    it("est insensible à la casse, aux espaces et à la ponctuation", () => {
      expect(lookupProductSlug(index, "  POSTGRES  ")).toBe("postgresql");
      expect(lookupProductSlug(index, "Postgre SQL")).toBe("postgresql");
    });

    it("conserve les alias internes en complément du catalogue", () => {
      expect(lookupProductSlug(index, ".NET Core")).toBe("dotnet");
      expect(lookupProductSlug(index, "SQL Server")).toBe("mssqlserver");
      // « Java » n'existe dans le catalogue que par distribution.
      expect(lookupProductSlug(index, "Java")).toBe("oracle-jdk");
      expect(lookupProductSlug(index, "OpenJDK")).toBe("eclipse-temurin");
    });

    it("renvoie null pour un produit absent du catalogue", () => {
      expect(lookupProductSlug(index, "Logiciel Interne Maison")).toBeNull();
      expect(lookupProductSlug(index, "")).toBeNull();
    });
  });

  describe("matchRelease", () => {
    it("associe une version au cycle correspondant (préfixe major)", () => {
      expect(matchRelease(RELEASES, "20.11")?.name).toBe("20");
      expect(matchRelease(RELEASES, "18.0.0")?.name).toBe("18");
    });

    it("associe une version exactement égale au nom de cycle", () => {
      expect(matchRelease(RELEASES, "24")?.name).toBe("24");
    });

    it("renvoie null si aucun cycle ne correspond", () => {
      expect(matchRelease(RELEASES, "12.0")).toBeNull();
      expect(matchRelease(RELEASES, "")).toBeNull();
    });

    it("se replie sur le libellé commercial du cycle (ex. SQL Server)", () => {
      const releases: EndoflifeRelease[] = [
        { name: "16.0", label: "2022 'Dallas'" },
        { name: "15.0", label: "2019 'Aris/Seattle'", eolFrom: "2030-01-08" },
        { name: "13.0-sp3", label: "2016 SP3" },
      ];
      expect(matchRelease(releases, "2019")?.name).toBe("15.0");
      expect(matchRelease(releases, "2016 SP3")?.name).toBe("13.0-sp3");
      // Frontière : « 2019 » ne doit pas matcher un label « 20191 »
      expect(matchRelease([{ name: "x", label: "20191" }], "2019")).toBeNull();
      // Le nom de cycle reste prioritaire sur le label
      expect(matchRelease(releases, "16.0")?.name).toBe("16.0");
    });

    it("se replie sur le nom de code du cycle (ex. Debian)", () => {
      const releases: EndoflifeRelease[] = [
        { name: "13", codename: "trixie" },
        { name: "12", codename: "bookworm", eolFrom: "2028-06-30" },
      ];
      expect(matchRelease(releases, "Bookworm")?.name).toBe("12");
    });

    it("ignore un préfixe « v » devant la version (ex. Node.js)", () => {
      expect(matchRelease(RELEASES, "v20.11")?.name).toBe("20");
      expect(matchRelease(RELEASES, "V24")?.name).toBe("24");
      expect(matchRelease(RELEASES, "v")).toBeNull();
    });

    it("accepte un major seul quand un unique cycle le porte (ex. Tomcat)", () => {
      const releases: EndoflifeRelease[] = [
        { name: "11.0", label: "11.0" },
        { name: "10.1", label: "10.1" },
        { name: "9.0", label: "9.0", eolFrom: "2027-03-31" },
      ];
      expect(matchRelease(releases, "9")?.name).toBe("9.0");
    });

    it("ne tranche pas entre plusieurs cycles portant le même major", () => {
      // MySQL : « 8 » peut désigner 8.0 (fin de vie 2026) ou 8.4 (2032).
      const mysql: EndoflifeRelease[] = [
        { name: "9.6", label: "9.6" },
        { name: "8.4", label: "8.4 (LTS)", eolFrom: "2032-04-30" },
        { name: "8.0", label: "8.0 (LTS)", eolFrom: "2026-04-30" },
      ];
      expect(matchRelease(mysql, "8")).toBeNull();
      // Python : « 3 » ne doit pas hériter de la fin de vie du dernier cycle 3.x.
      const python: EndoflifeRelease[] = [
        { name: "3.14", label: "3.14", eolFrom: "2030-10-31" },
        { name: "3.13", label: "3.13", eolFrom: "2029-10-31" },
      ];
      expect(matchRelease(python, "3")).toBeNull();
    });
  });

  describe("parseEolDate", () => {
    it("renvoie la date de fin de vie du cycle correspondant", () => {
      expect(parseEolDate(RELEASES, "20.11")).toEqual(new Date("2026-04-30"));
      expect(parseEolDate(RELEASES, "18.19.0")).toEqual(new Date("2025-04-30"));
    });

    it("renvoie null si la version ne correspond à aucun cycle", () => {
      expect(parseEolDate(RELEASES, "12.0")).toBeNull();
    });

    it("renvoie null si le cycle n'a pas de date de fin de vie", () => {
      const releases: EndoflifeRelease[] = [{ name: "1", eolFrom: null }];
      expect(parseEolDate(releases, "1.0")).toBeNull();
    });
  });

  describe("parseEolInfo", () => {
    it("extrait EOL, fin de support actif et dernière version du cycle", () => {
      expect(parseEolInfo(RELEASES, "24.1")).toEqual({
        eolDate: new Date("2028-04-30"),
        eoasDate: new Date("2026-10-20"),
        latestVersion: "24.5.0",
      });
    });

    it("renvoie des valeurs nulles pour les champs absents du cycle", () => {
      expect(parseEolInfo(RELEASES, "20.11")).toEqual({
        eolDate: new Date("2026-04-30"),
        eoasDate: null,
        latestVersion: null,
      });
    });

    it("renvoie tout à null si la version ne correspond à aucun cycle", () => {
      expect(parseEolInfo(RELEASES, "12.0")).toEqual({
        eolDate: null,
        eoasDate: null,
        latestVersion: null,
      });
      expect(parseEolInfo(RELEASES, "")).toEqual({
        eolDate: null,
        eoasDate: null,
        latestVersion: null,
      });
    });
  });

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
        HTTPS_PROXY: "http://user:s3cret@proxy.example:3128",
      });
      expect(line).toContain("via le proxy proxy.example:3128");
      expect(line).not.toContain("s3cret");
    });

    it("suit la précédence d'undici : minuscules d'abord, HTTPS avant HTTP", () => {
      expect(
        describeProxyConfig({
          https_proxy: "http://lower:1",
          HTTPS_PROXY: "http://upper:2",
        }),
      ).toContain("lower:1");
      expect(
        describeProxyConfig({ HTTP_PROXY: "http://http-only:3" }),
      ).toContain("http-only:3");
      expect(
        describeProxyConfig({
          HTTP_PROXY: "http://http:3",
          HTTPS_PROXY: "http://https:4",
        }),
      ).toContain("https:4");
    });

    it("mentionne les exclusions NO_PROXY", () => {
      expect(
        describeProxyConfig({
          HTTPS_PROXY: "http://proxy:3128",
          NO_PROXY: "localhost,.minint.fr",
        }),
      ).toContain("« localhost,.minint.fr »");
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
});
