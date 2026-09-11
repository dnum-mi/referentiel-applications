import { createPinia, setActivePinia } from "pinia";
import type { UserWithPermissions } from "@/client/types.gen";
import { reauthLoopState, setReauthLoop } from "@/composables/use-auth-level";
import { useToasterStore } from "./toasterStore";
import { useUserStore } from "./userStore";

const { findMeMock, updateMeMock, subscribeMock, unsubscribeMock, getUserMock, oidcEvents } = vi.hoisted(() => ({
  findMeMock: vi.fn(),
  updateMeMock: vi.fn(),
  subscribeMock: vi.fn(),
  unsubscribeMock: vi.fn(),
  getUserMock: vi.fn().mockResolvedValue(null),
  oidcEvents: { loaded: () => {}, unloaded: () => {} },
}));
vi.mock("@/api/index", () => ({
  default: {
    userControllerFindMe: (...args: unknown[]) => findMeMock(...args),
    userControllerUpdateMe: (...args: unknown[]) => updateMeMock(...args),
    userControllerSubscribe: (...args: unknown[]) => subscribeMock(...args),
    userControllerUnsubscribe: (...args: unknown[]) => unsubscribeMock(...args),
  },
}));
vi.mock("@/services/authentication", () => ({
  USER_MANAGER: {
    events: {
      addUserLoaded: (callback: () => void) => {
        oidcEvents.loaded = callback;
      },
      addUserUnloaded: (callback: () => void) => {
        oidcEvents.unloaded = callback;
      },
    },
    getUser: (...args: unknown[]) => getUserMock(...args),
  },
}));

const userWithScope = (path: string | null): UserWithPermissions =>
  ({
    id: "admin-1",
    role: "ADMIN",
    permissions: [],
    additionalPermissions: [],
    scopeOrganization: path ? { id: "scope-org", path } : null,
  }) as unknown as UserWithPermissions;

// #2508 : même règle que le backend (#2370/#2371) — ancrage à la frontière de segment,
// cible sans organisation hors de tout périmètre.
describe("userStore.isWithinScope", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("autorise tout pour un administrateur sans périmètre", () => {
    const store = useUserStore();
    store.user = userWithScope(null);
    expect(store.isWithinScope("/MI/DGPN")).toBe(true);
    expect(store.isWithinScope(null)).toBe(true);
    expect(store.isWithinScope(undefined)).toBe(true);
  });

  it("accepte le périmètre lui-même et ses descendants", () => {
    const store = useUserStore();
    store.user = userWithScope("/MI/SG");
    expect(store.isWithinScope("/MI/SG")).toBe(true);
    expect(store.isWithinScope("/MI/SG/DNUM")).toBe(true);
    expect(store.isWithinScope("/MI/SG/DNUM/SDAN")).toBe(true);
  });

  it("refuse un simple préfixe de chaîne (/SG ne couvre pas /SGAMI)", () => {
    const store = useUserStore();
    store.user = userWithScope("/MI/SG");
    expect(store.isWithinScope("/MI/SGAMI")).toBe(false);
    expect(store.isWithinScope("/MI/SG-BIS/X")).toBe(false);
  });

  it("refuse une organisation hors périmètre", () => {
    const store = useUserStore();
    store.user = userWithScope("/MI/SG");
    expect(store.isWithinScope("/MI/DGPN")).toBe(false);
    expect(store.isWithinScope("/MI")).toBe(false);
  });

  it("place une cible sans organisation hors du périmètre d'un admin scopé", () => {
    const store = useUserStore();
    store.user = userWithScope("/MI/SG");
    expect(store.isWithinScope(null)).toBe(false);
    expect(store.isWithinScope(undefined)).toBe(false);
    expect(store.isWithinScope("")).toBe(false);
  });
});

// #1985 : niveau d'authentification décidé par le backend, jamais par le front.
describe("userStore — niveau d'authentification (#1985)", () => {
  const assignMock = vi.fn();

  beforeEach(() => {
    setActivePinia(createPinia());
    sessionStorage.clear();
    localStorage.clear();
    findMeMock.mockReset();
    updateMeMock.mockReset();
    subscribeMock.mockReset();
    unsubscribeMock.mockReset();
    getUserMock.mockReset().mockResolvedValue(null);
    assignMock.mockReset();
    setReauthLoop(null);
    vi.stubGlobal("location", { ...globalThis.location, assign: assignMock, pathname: "/", search: "" });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const me = (authLevel: UserWithPermissions["authLevel"], role = "VISITOR"): UserWithPermissions =>
    ({ id: "u-1", role, permissions: [], additionalPermissions: [], authLevel }) as unknown as UserWithPermissions;
  const okResponse = (data: UserWithPermissions) => ({ data, response: { ok: true, status: 200 } });
  const deferred = <T>() => {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((r) => (resolve = r));
    return { promise, resolve };
  };

  it("n'est rétrogradé que sur `downgraded`, jamais sur le niveau", () => {
    const store = useUserStore();
    expect(store.isAuthDowngraded).toBe(false);
    store.user = me(undefined);
    expect(store.isAuthDowngraded).toBe(false);
    store.user = me({ level: "weak", downgraded: false, reason: "weak-method" });
    expect(store.isAuthDowngraded).toBe(false);
    store.user = me({ level: "weak", downgraded: true, reason: "weak-method" });
    expect(store.isAuthDowngraded).toBe(true);
    expect(store.authLevel?.reason).toBe("weak-method");
  });

  it("purge une impersonation persistée refusée par un 403 et repart d'un état propre", async () => {
    localStorage.setItem("impersonatedUserId", "target");
    localStorage.setItem("impersonatedUserEmail", "t@example.test");
    localStorage.setItem("impersonatorEmail", "a@example.test");
    findMeMock.mockResolvedValue({ data: undefined, response: { ok: false, status: 403 } });
    const store = useUserStore();

    await store.fetchUser();

    expect(localStorage.getItem("impersonatedUserId")).toBeNull();
    expect(store.impersonation).toBeNull();
    expect(assignMock).toHaveBeenCalledWith("/");
  });

  it("ne touche à rien sur un 403 sans impersonation persistée", async () => {
    findMeMock.mockResolvedValue({ data: undefined, response: { ok: false, status: 403 } });
    const store = useUserStore();
    await store.fetchUser();
    expect(assignMock).not.toHaveBeenCalled();
  });

  it("confirme la reconnexion forte par un toast quand la session n'est plus rétrogradée", async () => {
    sessionStorage.setItem("strongReauthAttempt", "1");
    findMeMock.mockResolvedValue(okResponse(me({ level: "strong", downgraded: false, reason: "strong-method" }, "ADMIN")));
    const store = useUserStore();
    const toaster = useToasterStore();
    const success = vi.spyOn(toaster, "addSuccessMessage");

    await store.fetchUser();

    expect(success).toHaveBeenCalledWith(expect.stringContaining("Authentification forte confirmée"));
    expect(reauthLoopState.value).toBeNull();
    expect(sessionStorage.getItem("strongReauthAttempt")).toBeNull();
  });

  it("signale une boucle quand la reconnexion laisse la session rétrogradée", async () => {
    sessionStorage.setItem("strongReauthAttempt", "1");
    findMeMock.mockResolvedValue(okResponse(me({ level: "weak", downgraded: true, reason: "weak-method" })));
    const store = useUserStore();
    const success = vi.spyOn(useToasterStore(), "addSuccessMessage");

    await store.fetchUser();

    expect(reauthLoopState.value).toBe("prompt");
    expect(success).not.toHaveBeenCalled();
  });

  it("n'affiche aucun toast sans tentative de reconnexion", async () => {
    findMeMock.mockResolvedValue(okResponse(me({ level: "strong", downgraded: false, reason: "strong-method" })));
    const store = useUserStore();
    const success = vi.spyOn(useToasterStore(), "addSuccessMessage");
    await store.fetchUser();
    expect(success).not.toHaveBeenCalled();
  });

  it("explique après rechargement qu'une impersonation a été interrompue", async () => {
    sessionStorage.setItem("stepDownNotice", "impersonation");
    findMeMock.mockResolvedValue(okResponse(me({ level: "weak", downgraded: true, reason: "weak-method" })));
    const store = useUserStore();
    const error = vi.spyOn(useToasterStore(), "addErrorMessage");
    await store.fetchUser();
    expect(error).toHaveBeenCalledWith(expect.stringContaining("impersonation a été interrompue"));
    expect(sessionStorage.getItem("stepDownNotice")).toBeNull();
  });

  // Course au retour du callback OIDC : un /users/me lancé avec l'ancien jeton faible peut
  // répondre APRÈS celui de la nouvelle session forte. Seule la réponse la plus récente compte.
  it("ignore une réponse périmée de /users/me arrivée après la plus récente", async () => {
    sessionStorage.setItem("strongReauthAttempt", "1");
    const stale = deferred<ReturnType<typeof okResponse>>();
    const fresh = deferred<ReturnType<typeof okResponse>>();
    findMeMock.mockReturnValueOnce(stale.promise).mockReturnValueOnce(fresh.promise);
    const store = useUserStore();
    const success = vi.spyOn(useToasterStore(), "addSuccessMessage");

    const first = store.fetchUser();
    const second = store.fetchUser();
    fresh.resolve(okResponse(me({ level: "strong", downgraded: false, reason: "strong-method" }, "ADMIN")));
    await second;
    stale.resolve(okResponse(me({ level: "weak", downgraded: true, reason: "weak-method" })));
    await first;

    expect(store.user?.role).toBe("ADMIN");
    expect(store.isAuthDowngraded).toBe(false);
    expect(reauthLoopState.value).toBeNull();
    expect(success).toHaveBeenCalledTimes(1);
  });

  it("ne laisse pas une réponse périmée consommer le drapeau de reconnexion", async () => {
    sessionStorage.setItem("strongReauthAttempt", "1");
    const stale = deferred<ReturnType<typeof okResponse>>();
    const fresh = deferred<ReturnType<typeof okResponse>>();
    findMeMock.mockReturnValueOnce(stale.promise).mockReturnValueOnce(fresh.promise);
    const store = useUserStore();

    const first = store.fetchUser();
    const second = store.fetchUser();
    stale.resolve(okResponse(me({ level: "weak", downgraded: true, reason: "weak-method" })));
    await first;
    // La réponse périmée n'a rien consommé : le drapeau attend la réponse la plus récente.
    expect(sessionStorage.getItem("strongReauthAttempt")).toBe("1");
    expect(reauthLoopState.value).toBeNull();
    fresh.resolve(okResponse(me({ level: "strong", downgraded: false, reason: "strong-method" }, "ADMIN")));
    await second;

    expect(store.user?.role).toBe("ADMIN");
    expect(sessionStorage.getItem("strongReauthAttempt")).toBeNull();
  });

  it("ignore le /me en vol après userUnloaded, même avant le prochain fetch", async () => {
    const pending = deferred<ReturnType<typeof okResponse>>();
    findMeMock.mockReturnValue(pending.promise);
    const store = useUserStore();
    const fetching = store.fetchUser();
    oidcEvents.unloaded();
    sessionStorage.setItem("strongReauthAttempt", "prompt");
    pending.resolve(okResponse(me({ level: "weak", downgraded: true, reason: "weak-method" })));
    await fetching;
    expect(store.user).toBeUndefined();
    expect(store.authenticated).toBe(false);
    expect(sessionStorage.getItem("strongReauthAttempt")).toBe("prompt");
    expect(reauthLoopState.value).toBeNull();
  });

  it.each(["loaded", "unloaded"] as const)("ignore getUser du démarrage après un événement %s", async (event) => {
    const startup = deferred<object | null>();
    getUserMock.mockReturnValueOnce(startup.promise);
    findMeMock.mockResolvedValue(okResponse(me({ level: "strong", downgraded: false, reason: "strong-method" }, "ADMIN")));
    const store = useUserStore();
    oidcEvents[event]();
    await Promise.resolve();
    startup.resolve(event === "loaded" ? null : {});
    await Promise.resolve();
    expect(store.authenticated).toBe(event === "loaded");
    expect(findMeMock).toHaveBeenCalledTimes(event === "loaded" ? 1 : 0);
    expect(store.user?.role).toBe(event === "loaded" ? "ADMIN" : undefined);
  });

  const mutations = ["preferences", "subscribe", "unsubscribe"] as const;
  function startMutation(store: ReturnType<typeof useUserStore>, mutation: (typeof mutations)[number]) {
    if (mutation === "preferences") return store.updateEmailPreferences(true);
    if (mutation === "subscribe") return store.subscribeToApp("app-1");
    return store.unsubscribeFromApp("app-1");
  }

  it.each(mutations)("une réponse %s ne remplace pas les droits plus récents", async (mutation) => {
    const pending = deferred<ReturnType<typeof okResponse>>();
    updateMeMock.mockReturnValue(pending.promise);
    subscribeMock.mockReturnValue(pending.promise);
    unsubscribeMock.mockReturnValue(pending.promise);
    const store = useUserStore();
    store.user = me({ level: "weak", downgraded: true, reason: "weak-method" });
    const updating = startMutation(store, mutation);
    const strong = me({ level: "strong", downgraded: false, reason: "strong-method" }, "ADMIN");
    findMeMock.mockResolvedValue(okResponse(strong));
    await store.fetchUser();
    pending.resolve(
      okResponse({
        ...me({ level: "weak", downgraded: true, reason: "weak-method" }),
        emailNotificationsEnabled: true,
        followedApplications: [],
      }),
    );
    await updating;
    expect(store.user?.role).toBe("ADMIN");
    expect(store.isAuthDowngraded).toBe(false);
    if (mutation === "preferences") expect(store.user?.emailNotificationsEnabled).toBe(true);
  });

  it.each(mutations)("une réponse %s de la session précédente est entièrement ignorée", async (mutation) => {
    const pending = deferred<ReturnType<typeof okResponse>>();
    updateMeMock.mockReturnValue(pending.promise);
    subscribeMock.mockReturnValue(pending.promise);
    unsubscribeMock.mockReturnValue(pending.promise);
    const store = useUserStore();
    store.user = me(undefined);
    const updating = startMutation(store, mutation);
    oidcEvents.unloaded();
    pending.resolve(okResponse({ ...me(undefined), emailNotificationsEnabled: true, followedApplications: [] }));
    await updating;
    expect(store.user).toBeUndefined();
  });

  it.each([undefined, { level: "weak", downgraded: false, reason: "weak-method" }] as const)(
    "n'annonce pas de MFA confirmée si le contrôle est désactivé ou en observation (%j)",
    async (authLevel) => {
      sessionStorage.setItem("strongReauthAttempt", "prompt");
      findMeMock.mockResolvedValue(okResponse(me(authLevel)));
      const store = useUserStore();
      const success = vi.spyOn(useToasterStore(), "addSuccessMessage");
      await store.fetchUser();
      expect(success).not.toHaveBeenCalled();
    },
  );

  it("retient la stratégie `logout` quand la déconnexion complète laisse la session faible", async () => {
    sessionStorage.setItem("strongReauthAttempt", "logout");
    findMeMock.mockResolvedValue(okResponse(me({ level: "weak", downgraded: true, reason: "weak-method" })));
    const store = useUserStore();

    await store.fetchUser();

    expect(reauthLoopState.value).toBe("logout");
  });

  it("efface la bascule dès qu'une session forte est constatée, sans toast faute de tentative", async () => {
    setReauthLoop("prompt");
    findMeMock.mockResolvedValue(okResponse(me({ level: "strong", downgraded: false, reason: "strong-method" }, "ADMIN")));
    const store = useUserStore();
    const success = vi.spyOn(useToasterStore(), "addSuccessMessage");

    await store.fetchUser();

    expect(reauthLoopState.value).toBeNull();
    expect(sessionStorage.getItem("strongReauthLoop")).toBeNull();
    expect(success).not.toHaveBeenCalled();
  });

  it("garde la bascule retenue quand la session reste faible sans nouvelle tentative", async () => {
    setReauthLoop("prompt");
    findMeMock.mockResolvedValue(okResponse(me({ level: "weak", downgraded: true, reason: "weak-method" })));
    const store = useUserStore();

    await store.fetchUser();

    expect(reauthLoopState.value).toBe("prompt");
  });
});
