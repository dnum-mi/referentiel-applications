import { authLevelConfig, parseCsvList } from "./auth-level.config";

describe("authLevelConfig", () => {
  const initial = { ...process.env };

  beforeEach(() => {
    delete process.env.AUTH_LEVEL_MODE;
    delete process.env.AUTH_LEVEL_CLAIM;
    delete process.env.AUTH_LEVEL_STRONG_VALUES;
    delete process.env.AUTH_LEVEL_IDP_CLAIM;
    delete process.env.AUTH_LEVEL_TRUSTED_IDPS;
    delete process.env.AUTH_LEVEL_REAUTH_ENABLED;
    delete process.env.AUTH_LEVEL_REAUTH_PROMPT;
    delete process.env.AUTH_LEVEL_REAUTH_ACR_VALUES;
    delete process.env.AUTH_LEVEL_REAUTH_MAX_AGE;
    delete process.env.AUTH_LEVEL_HELP_URL;
    delete process.env.AUTH_LEVEL_REAUTH_STRATEGY;
    delete process.env.AUTH_LEVEL_USERINFO_FALLBACK;
    delete process.env.AUTH_LEVEL_USERINFO_URL;
    delete process.env.AUTH_LEVEL_USERINFO_TIMEOUT_MS;
  });

  afterEach(() => {
    process.env = { ...initial };
  });

  // La fonctionnalité doit être inerte à la livraison : l'activation est un acte
  // d'exploitation, environnement par environnement.
  it("reste désactivée tant que le mode n'est pas explicitement posé", () => {
    expect(authLevelConfig().mode).toBe("off");
    process.env.AUTH_LEVEL_MODE = "";
    expect(authLevelConfig().mode).toBe("off");
  });

  it("refuse un mode inconnu au démarrage", () => {
    process.env.AUTH_LEVEL_MODE = "on";
    expect(() => authLevelConfig()).toThrow(/AUTH_LEVEL_MODE/);
  });

  // Un mode actif sans claim rétrograderait 100 % des sessions : il ne doit pas démarrer.
  it.each(["observe", "enforce"])(
    "refuse le mode %s sans claim ni valeurs fortes",
    (mode) => {
      process.env.AUTH_LEVEL_MODE = mode;
      expect(() => authLevelConfig()).toThrow(/AUTH_LEVEL_CLAIM/);
      process.env.AUTH_LEVEL_CLAIM = "auth_mode";
      expect(() => authLevelConfig()).toThrow(/AUTH_LEVEL_STRONG_VALUES/);
      process.env.AUTH_LEVEL_STRONG_VALUES = "CARD";
      expect(authLevelConfig().mode).toBe(mode);
    },
  );

  it("normalise les listes CSV (espaces, casse, entrées vides) et le mode", () => {
    process.env.AUTH_LEVEL_MODE = " Enforce ";
    process.env.AUTH_LEVEL_CLAIM = " auth_mode ";
    process.env.AUTH_LEVEL_STRONG_VALUES = " CARD, Otp ,, ";
    process.env.AUTH_LEVEL_IDP_CLAIM = "auth_idp";
    process.env.AUTH_LEVEL_TRUSTED_IDPS = "Partenaire, AUTRE";
    const config = authLevelConfig();
    expect(config.mode).toBe("enforce");
    expect(config.claim).toBe("auth_mode");
    expect(config.strongValues).toEqual(["card", "otp"]);
    expect(config.idpClaim).toBe("auth_idp");
    expect(config.trustedIdps).toEqual(["partenaire", "autre"]);
  });

  it("propose la reconnexion forte par défaut avec prompt=login, sans acr_values ni max_age", () => {
    const { reauth, helpUrl, trustedIdps } = authLevelConfig();
    expect(reauth).toEqual({
      enabled: true,
      prompt: "login",
      acrValues: undefined,
      maxAge: undefined,
      strategy: "prompt",
    });
    expect(helpUrl).toBeUndefined();
    expect(trustedIdps).toEqual([]);
  });

  it("lit les paramètres de reconnexion et la page d'aide", () => {
    process.env.AUTH_LEVEL_REAUTH_ENABLED = "false";
    process.env.AUTH_LEVEL_REAUTH_PROMPT = "consent login";
    process.env.AUTH_LEVEL_REAUTH_ACR_VALUES = "eidas2";
    process.env.AUTH_LEVEL_REAUTH_MAX_AGE = "0";
    process.env.AUTH_LEVEL_HELP_URL = "https://intranet.example/aide-2fa";
    const { reauth, helpUrl } = authLevelConfig();
    expect(reauth).toEqual({
      enabled: false,
      prompt: "consent login",
      acrValues: "eidas2",
      maxAge: 0,
      strategy: "prompt",
    });
    expect(helpUrl).toBe("https://intranet.example/aide-2fa");
  });

  it.each(["abc", "-1", "12.5"])("ignore un max_age invalide (%s)", (value) => {
    process.env.AUTH_LEVEL_REAUTH_MAX_AGE = value;
    expect(authLevelConfig().reauth.maxAge).toBeUndefined();
  });

  it("parseCsvList ignore les entrées vides", () => {
    expect(parseCsvList(undefined)).toEqual([]);
    expect(parseCsvList("")).toEqual([]);
    expect(parseCsvList(" , ,")).toEqual([]);
  });

  it("choisit la stratégie de reconnexion, prompt par défaut et en cas de valeur inconnue", () => {
    expect(authLevelConfig().reauth.strategy).toBe("prompt");
    process.env.AUTH_LEVEL_REAUTH_STRATEGY = " Logout ";
    expect(authLevelConfig().reauth.strategy).toBe("logout");
    process.env.AUTH_LEVEL_REAUTH_STRATEGY = "redirect";
    expect(authLevelConfig().reauth.strategy).toBe("prompt");
  });

  // Inerte par défaut, comme le reste : le repli n'appelle le fournisseur que s'il est demandé.
  it("laisse le repli userinfo désactivé par défaut", () => {
    expect(authLevelConfig().userinfo).toEqual({
      enabled: false,
      url: undefined,
      timeoutMs: 2000,
    });
  });

  it("lit le repli userinfo, son URL explicite et son délai", () => {
    process.env.AUTH_LEVEL_USERINFO_FALLBACK = "true";
    process.env.AUTH_LEVEL_USERINFO_URL =
      " https://idp.example/oauth2/userinfo ";
    process.env.AUTH_LEVEL_USERINFO_TIMEOUT_MS = "1500";
    expect(authLevelConfig().userinfo).toEqual({
      enabled: true,
      url: "https://idp.example/oauth2/userinfo",
      timeoutMs: 1500,
    });
  });

  it.each(["abc", "-5", "0", "60001", "1.5"])(
    "retombe sur 2000 ms pour un délai userinfo invalide ou nul (%s)",
    (value) => {
      process.env.AUTH_LEVEL_USERINFO_TIMEOUT_MS = value;
      expect(authLevelConfig().userinfo.timeoutMs).toBe(2000);
    },
  );
});
