import type { ConfigDto } from "@/client";

const { signinRedirectMock, signoutRedirectMock, removeUserMock, userManagerSettings, configMock } = vi.hoisted(() => ({
  signinRedirectMock: vi.fn(),
  signoutRedirectMock: vi.fn(),
  removeUserMock: vi.fn(),
  userManagerSettings: { value: undefined as Record<string, unknown> | undefined },
  configMock: { value: {} as Omit<ConfigDto, "oidcScope"> & { oidcScope?: string } },
}));

const BASE_CONFIG: ConfigDto = {
  oidcConfigUrl: "https://idp.example/realms/refapp/.well-known/openid-configuration",
  oidcClientId: "refapp",
  oidcScope: "openid profile email niveau",
  version: "test",
  footerLinks: [],
};

vi.mock("oidc-client-ts", () => ({
  UserManager: class {
    constructor(settings: Record<string, unknown>) {
      userManagerSettings.value = settings;
    }
    signinRedirect = signinRedirectMock;
    signoutRedirect = signoutRedirectMock;
    removeUser = removeUserMock;
  },
}));
vi.mock("@/services/config", () => ({
  getConfig: () => Promise.resolve(configMock.value),
}));

// Le module lit la configuration au chargement (top-level await) : import dynamique par test.
async function loadModule() {
  vi.resetModules();
  return import("./authentication");
}

describe("authentication (#1985)", () => {
  beforeEach(() => {
    configMock.value = { ...BASE_CONFIG };
    signinRedirectMock.mockReset().mockResolvedValue(undefined);
    removeUserMock.mockReset().mockResolvedValue(undefined);
    signoutRedirectMock.mockReset().mockResolvedValue(undefined);
    sessionStorage.clear();
    localStorage.clear();
    window.history.replaceState({}, "", "/applications/42?tab=infos");
  });

  it("demande les scopes servis par le backend, sans paramètre de reconnexion global", async () => {
    await loadModule();
    expect(userManagerSettings.value).toMatchObject({
      authority: "https://idp.example/realms/refapp",
      client_id: "refapp",
      scope: "openid profile email niveau",
    });
    // Jamais de prompt/acr_values/max_age globaux : ils casseraient le renouvellement silencieux.
    expect(userManagerSettings.value).not.toHaveProperty("prompt");
    expect(userManagerSettings.value).not.toHaveProperty("acr_values");
    expect(userManagerSettings.value).not.toHaveProperty("max_age");
  });

  it.each([undefined, "", "  "])("garde les scopes historiques si l'ancien backend omet le scope (%s)", async (oidcScope) => {
    configMock.value = { ...BASE_CONFIG, oidcScope };
    await loadModule();
    expect(userManagerSettings.value?.scope).toBe("openid profile email");
  });

  it("signinStrong mémorise la page, retire l'ancien jeton, purge l'impersonation et force prompt=login", async () => {
    localStorage.setItem("impersonatedUserId", "target");
    localStorage.setItem("impersonatedUserEmail", "t@example.test");
    localStorage.setItem("impersonatorEmail", "a@example.test");
    const { signinStrong } = await loadModule();

    await signinStrong();

    expect(sessionStorage.getItem("redirectAfterLogin")).toBe("/applications/42?tab=infos");
    expect(sessionStorage.getItem("strongReauthAttempt")).toBe("prompt");
    expect(localStorage.getItem("impersonatedUserId")).toBeNull();
    // L'ancien jeton faible ne doit pas survivre au retour du callback (course de /users/me).
    expect(removeUserMock).toHaveBeenCalledTimes(1);
    expect(signinRedirectMock).toHaveBeenCalledWith({ prompt: "login" });
  });

  it("transmet acr_values et max_age quand ils sont configurés", async () => {
    configMock.value = {
      ...BASE_CONFIG,
      authLevel: { reauth: { strategy: "prompt", prompt: "login consent", acrValues: "eidas2", maxAge: 0 } },
    };
    const { signinStrong } = await loadModule();

    await signinStrong();

    expect(signinRedirectMock).toHaveBeenCalledWith({ prompt: "login consent", acr_values: "eidas2", max_age: 0 });
  });

  it("ne mémorise pas une page de callback OIDC comme destination de retour", async () => {
    window.history.replaceState({}, "", "/oidc/callback?code=abc");
    const { signinStrong } = await loadModule();

    await signinStrong();

    expect(sessionStorage.getItem("redirectAfterLogin")).toBeNull();
  });

  // Sans nettoyage, le prochain /users/me afficherait à tort « reconnexion non reconnue comme forte ».
  it("retire le drapeau de tentative si la redirection échoue", async () => {
    signinRedirectMock.mockRejectedValue(new Error("network"));
    const { signinStrong } = await loadModule();

    await expect(signinStrong()).rejects.toThrow("network");

    expect(sessionStorage.getItem("strongReauthAttempt")).toBeNull();
  });

  it("stratégie logout : ferme la session SSO sans retirer l'utilisateur ni passer par /authorize", async () => {
    const { signinStrong } = await loadModule();

    await signinStrong("logout");

    expect(signoutRedirectMock).toHaveBeenCalledTimes(1);
    expect(removeUserMock).not.toHaveBeenCalled();
    expect(signinRedirectMock).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("strongReauthAttempt")).toBe("logout");
    expect(sessionStorage.getItem("strongReauthAfterLogout")).not.toBeNull();
  });

  it("applique la stratégie servie par le serveur quand aucune n'est demandée", async () => {
    configMock.value = { ...BASE_CONFIG, authLevel: { reauth: { strategy: "logout", prompt: "login" } } };
    const { signinStrong } = await loadModule();

    await signinStrong();

    expect(signoutRedirectMock).toHaveBeenCalledTimes(1);
  });

  it("nettoie les drapeaux si la déconnexion échoue", async () => {
    signoutRedirectMock.mockRejectedValue(new Error("network"));
    const { signinStrong } = await loadModule();

    await expect(signinStrong("logout")).rejects.toThrow("network");

    expect(sessionStorage.getItem("strongReauthAttempt")).toBeNull();
    expect(sessionStorage.getItem("strongReauthAfterLogout")).toBeNull();
  });

  it("relance la connexion forte au retour de la déconnexion, une seule fois", async () => {
    const { signinStrong, resumeStrongReauthAfterLogout } = await loadModule();
    await signinStrong("logout");

    await expect(resumeStrongReauthAfterLogout()).resolves.toBe(true);
    expect(signinRedirectMock).toHaveBeenCalledWith({ prompt: "login" });
    await expect(resumeStrongReauthAfterLogout()).resolves.toBe(false);
    expect(signinRedirectMock).toHaveBeenCalledTimes(1);
    // Le drapeau de tentative survit : au retour, le store saura que `logout` a été tentée.
    expect(sessionStorage.getItem("strongReauthAttempt")).toBe("logout");
  });

  it("ne relance rien sans déconnexion demandée", async () => {
    const { resumeStrongReauthAfterLogout } = await loadModule();
    await expect(resumeStrongReauthAfterLogout()).resolves.toBe(false);
    expect(signinRedirectMock).not.toHaveBeenCalled();
  });
});
