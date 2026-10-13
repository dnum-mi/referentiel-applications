import { createPinia, setActivePinia } from "pinia";
import { User } from "oidc-client-ts";
import { flushPromises } from "@vue/test-utils";
import { Permission, Roles, type UserWithPermissions } from "@/client/types.gen";
import { reauthLoopState, setReauthLoop } from "@/composables/use-auth-level";
import { useToasterStore } from "./toasterStore";
import { useUserStore } from "./userStore";

const { findMeMock, updateMeMock, subscribeMock, unsubscribeMock, impersonateMock, getUserMock, oidcEvents } = vi.hoisted(() => ({
  findMeMock: vi.fn(),
  updateMeMock: vi.fn(),
  subscribeMock: vi.fn(),
  unsubscribeMock: vi.fn(),
  impersonateMock: vi.fn(),
  getUserMock: vi.fn().mockResolvedValue(null),
  oidcEvents: { loaded: (_user: User) => {}, unloaded: () => {} },
}));
vi.mock("@/api/index", () => ({
  default: {
    userControllerFindMe: (...args: unknown[]) => findMeMock(...args),
    userControllerUpdateMe: (...args: unknown[]) => updateMeMock(...args),
    userControllerSubscribe: (...args: unknown[]) => subscribeMock(...args),
    userControllerUnsubscribe: (...args: unknown[]) => unsubscribeMock(...args),
    userControllerImpersonate: (...args: unknown[]) => impersonateMock(...args),
  },
}));
vi.mock("@/services/authentication", () => ({
  USER_MANAGER: {
    events: {
      addUserLoaded: (callback: (user: User) => void) => {
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
    permissions: [Permission.TECHNOLOGY_LIST],
    additionalPermissions: [],
    scopeOrganization: path ? { id: "scope-org", path } : null,
  }) as unknown as UserWithPermissions;

function oidcSession(profile: Partial<User["profile"]> = {}, expiresAt = Math.floor(Date.now() / 1000) + 300) {
  return new User({
    access_token: "test-token",
    token_type: "Bearer",
    expires_at: expiresAt,
    profile: { iss: "https://sso.example.test", sub: "subject-1", sid: "session-1", aud: "refapp", iat: 1, exp: expiresAt, ...profile },
  });
}

describe("userStore.startImpersonation", () => {
  it.each([
    { response: { ok: false }, error: { message: "Refus" } },
    { response: { ok: true }, data: undefined },
  ])("signale une réponse refusée ou vide et conserve l’identité actuelle", async (response) => {
    setActivePinia(createPinia());
    getUserMock.mockResolvedValueOnce(null);
    const store = useUserStore();
    await flushPromises();
    store.authenticated = true;
    store.user = { ...userWithScope(null), email: "admin@example.test" };
    const target = { ...store.user, id: "target", email: "target@example.test" };
    impersonateMock.mockResolvedValueOnce(response);
    await expect(store.startImpersonation(target)).rejects.toThrow("La connexion sous cette identité a échoué");
    expect(store.user.id).toBe("admin-1");
    expect(store.authenticated).toBe(true);
    expect(store.impersonation).toBeNull();
  });
});

describe("userStore.canListTechnologies", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it.each(Object.values(Roles).flatMap((role) => [true, false].map((capability) => ({ role, capability }))))(
    "respecte les permissions effectives du profil $role, délégation = $capability",
    ({ role, capability }) => {
      const store = useUserStore();
      store.authenticated = true;
      store.user = {
        ...userWithScope(null),
        role,
        permissions: role === Roles.ADMIN ? [Permission.TECHNOLOGY_LIST] : [],
        additionalPermissions: capability ? [Permission.TECHNOLOGY_LIST] : [],
      };

      expect(store.canListTechnologies).toBe(role === Roles.ADMIN || (capability && role !== Roles.VISITOR));
    },
  );

  it.each([null, "MI/DNUM"])("accepte la permission héritée d'un ADMIN sans délégation (périmètre %s)", (scope) => {
    const store = useUserStore();
    store.authenticated = true;
    store.user = userWithScope(scope);
    expect(store.user.additionalPermissions).toEqual([]);
    expect(store.canListTechnologies).toBe(true);
  });

  it("n'invente pas de permission pour un ADMIN dont l'API ne l'accorde pas", () => {
    const store = useUserStore();
    store.authenticated = true;
    store.user = { ...userWithScope(null), permissions: [] };
    expect(store.canListTechnologies).toBe(false);
  });

  it.each([false, true])("applique la rétrogradation d'un administrateur en lecteur, délégation = %s", (delegated) => {
    const store = useUserStore();
    store.authenticated = true;
    store.user = { ...userWithScope(null), additionalPermissions: delegated ? [Permission.TECHNOLOGY_LIST] : [] };
    expect(store.canListTechnologies).toBe(true);

    store.user = { ...store.user, role: Roles.READER, permissions: [] };
    expect(store.canListTechnologies).toBe(delegated);
    store.user.additionalPermissions = [];
    expect(store.canListTechnologies).toBe(false);
  });

  it("le retrait d'une délégation ne retire pas la permission héritée d'un administrateur", () => {
    const store = useUserStore();
    store.authenticated = true;
    store.user = { ...userWithScope(null), additionalPermissions: [Permission.TECHNOLOGY_LIST] };
    store.user.additionalPermissions = [];
    expect(store.canListTechnologies).toBe(true);
  });

  it("un droit de fiche ne donne pas accès à la vue transverse", () => {
    const store = useUserStore();
    store.authenticated = true;
    store.user = { ...userWithScope(null), permissions: [Permission.TECHNOLOGY_READ, Permission.TECHNOLOGY_WRITE] };
    expect(store.canListTechnologies).toBe(false);
  });

  it("la capacité ne donne aucun droit de lecture ou d'écriture sur une fiche", () => {
    const store = useUserStore();
    store.authenticated = true;
    store.user = { ...userWithScope(null), role: Roles.READER, permissions: [], additionalPermissions: [Permission.TECHNOLOGY_LIST] };
    expect(store.canListTechnologies).toBe(true);
    expect(store.hasPermissions([Permission.TECHNOLOGY_READ, Permission.TECHNOLOGY_WRITE])).toBe(false);
  });

  it("retire l'accès dès la révocation, la déconnexion ou le refus d'authentification", () => {
    const store = useUserStore();
    store.authenticated = true;
    store.user = { ...userWithScope(null), role: Roles.READER, permissions: [], additionalPermissions: [Permission.TECHNOLOGY_LIST] };
    expect(store.canListTechnologies).toBe(true);
    store.user.additionalPermissions = [];
    expect(store.canListTechnologies).toBe(false);
    store.user.additionalPermissions = [Permission.TECHNOLOGY_LIST];
    store.authenticated = false;
    expect(store.canListTechnologies).toBe(false);
    store.authenticated = true;
    store.requireStrongAuth({ level: "weak", downgraded: true, reason: "weak-method" });
    expect(store.canListTechnologies).toBe(false);
  });
});

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

  it.each(["/ROOT/AREA/", "/ROOT/AREA///", "/root/area/"])("garde les actions accessibles dans le périmètre %s", (scope) => {
    const store = useUserStore();
    store.user = userWithScope(scope);
    expect(store.isWithinScope("/ROOT/AREA")).toBe(true);
    expect(store.isWithinScope("/ROOT/AREA/CHILD")).toBe(true);
    expect(store.isWithinScope("/ROOT/AREA2")).toBe(false);
    expect(store.isWithinScope("/OTHER/ROOT/AREA/CHILD")).toBe(false);
    expect(store.isWithinScope(null)).toBe(false);
  });

  it("ne transforme pas un périmètre constitué de séparateurs en accès global", () => {
    const store = useUserStore();
    store.user = userWithScope("///");
    expect(store.isWithinScope("/ROOT/AREA")).toBe(false);
    expect(store.isWithinScope("///")).toBe(false);
    expect(store.isWithinScope(null)).toBe(false);
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

  const deniedLevel = { level: "weak", downgraded: true, reason: "weak-method" } as const;
  const deniedResponse = {
    error: { strongAuthRequired: true, authLevel: deniedLevel },
    response: { ok: false, status: 403 },
  };

  async function startVerifiedSession() {
    getUserMock.mockResolvedValueOnce(oidcSession());
    findMeMock.mockResolvedValue(okResponse(me({ level: "strong", downgraded: false, reason: "strong-method" }, "ADMIN")));
    const store = useUserStore();
    await flushPromises();
    expect(store.hasApplicationAccess).toBe(true);
    return store;
  }

  it("conserve la vue pendant un renouvellement de la même session puis applique les droits revalidés", async () => {
    const store = await startVerifiedSession();
    const original = store.user;
    const pending = deferred<ReturnType<typeof okResponse>>();
    findMeMock.mockReturnValueOnce(pending.promise);
    oidcEvents.loaded(oidcSession());
    expect(store.user).toBe(original);
    expect(store.hasApplicationAccess).toBe(true);
    pending.resolve(okResponse(me({ level: "strong", downgraded: false, reason: "strong-method" }, "READER")));
    await flushPromises();
    expect(store.user?.role).toBe("READER");
    expect(store.hasApplicationAccess).toBe(true);
  });

  it.each([
    ["fournisseur", { iss: "https://other.example.test" }],
    ["identité", { sub: "subject-2" }],
    ["session", { sid: "session-2" }],
    ["session absente", { sid: undefined }],
  ] as const)("retire immédiatement le contexte quand le renouvellement change %s", async (_name, profile) => {
    const store = await startVerifiedSession();
    const pending = deferred<ReturnType<typeof okResponse>>();
    findMeMock.mockReturnValueOnce(pending.promise);
    oidcEvents.loaded(oidcSession(profile));
    expect(store.user).toBeUndefined();
    expect(store.hasApplicationAccess).toBe(false);
    pending.resolve(okResponse(me(undefined)));
    await flushPromises();
  });

  it("ne conserve pas le contexte avec un jeton expiré", async () => {
    const store = await startVerifiedSession();
    findMeMock.mockResolvedValueOnce(deniedResponse);
    oidcEvents.loaded(oidcSession({}, 1));
    expect(store.user).toBeUndefined();
    expect(store.hasApplicationAccess).toBe(false);
    await flushPromises();
    expect(store.isAuthDowngraded).toBe(true);
  });

  it.each(["refus fort", "refus", "indisponibilité", "réseau"] as const)(
    "révoque le contexte conservé si la revalidation échoue : %s",
    async (failure) => {
      const store = await startVerifiedSession();
      if (failure === "réseau") findMeMock.mockRejectedValueOnce(new Error("Indisponible"));
      else if (failure === "refus fort") findMeMock.mockResolvedValueOnce(deniedResponse);
      else findMeMock.mockResolvedValueOnce({ response: { ok: false, status: failure === "refus" ? 403 : 500 } });
      oidcEvents.loaded(oidcSession());
      await flushPromises();
      expect(store.user).toBeUndefined();
      expect(store.hasApplicationAccess).toBe(false);
      expect(store.isAuthDowngraded).toBe(failure === "refus fort");
    },
  );

  it("ignore le refus tardif d'un renouvellement après une revalidation plus récente", async () => {
    const store = await startVerifiedSession();
    const stale = deferred<typeof deniedResponse>();
    findMeMock.mockReturnValueOnce(stale.promise);
    oidcEvents.loaded(oidcSession());
    oidcEvents.loaded(oidcSession());
    await flushPromises();
    stale.resolve(deniedResponse);
    await flushPromises();
    expect(store.hasApplicationAccess).toBe(true);
    expect(store.isAuthDowngraded).toBe(false);
  });

  it.each(["refus", "indisponibilité", "réseau"] as const)(
    "révoque aussi le contexte si un fetch ordinaire prend le relais du renouvellement : %s",
    async (failure) => {
      const store = await startVerifiedSession();
      const pending = deferred<ReturnType<typeof okResponse>>();
      findMeMock.mockReturnValueOnce(pending.promise);
      oidcEvents.loaded(oidcSession());
      if (failure === "réseau") findMeMock.mockRejectedValueOnce(new Error("Indisponible"));
      else findMeMock.mockResolvedValueOnce({ response: { ok: false, status: failure === "refus" ? 403 : 500 } });
      await store.fetchUser();
      expect(store.user).toBeUndefined();
      expect(store.hasApplicationAccess).toBe(false);
      pending.resolve(okResponse(me(undefined)));
      await flushPromises();
      expect(store.hasApplicationAccess).toBe(false);
    },
  );

  it("accepte la revalidation ordinaire plus récente et ignore le refus tardif du renouvellement", async () => {
    const store = await startVerifiedSession();
    const stale = deferred<typeof deniedResponse>();
    findMeMock.mockReturnValueOnce(stale.promise);
    oidcEvents.loaded(oidcSession());
    await store.fetchUser();
    stale.resolve(deniedResponse);
    await flushPromises();
    expect(store.hasApplicationAccess).toBe(true);
    expect(store.isAuthDowngraded).toBe(false);
  });

  it("conserve à nouveau le contexte après une revalidation en échec suivie d'une reprise réussie", async () => {
    const store = await startVerifiedSession();
    findMeMock.mockResolvedValueOnce({ response: { ok: false, status: 500 } });
    oidcEvents.loaded(oidcSession());
    await flushPromises();
    expect(store.hasApplicationAccess).toBe(false);
    await store.fetchUser();
    expect(store.hasApplicationAccess).toBe(true);
    const original = store.user;
    const pending = deferred<ReturnType<typeof okResponse>>();
    findMeMock.mockReturnValueOnce(pending.promise);
    oidcEvents.loaded(oidcSession());
    expect(store.user).toBe(original);
    expect(store.hasApplicationAccess).toBe(true);
    pending.resolve(okResponse(me(undefined)));
    await flushPromises();
  });

  it("une déconnexion empêche le renouvellement en vol de rétablir le contexte", async () => {
    const store = await startVerifiedSession();
    const pending = deferred<ReturnType<typeof okResponse>>();
    findMeMock.mockReturnValueOnce(pending.promise);
    oidcEvents.loaded(oidcSession());
    oidcEvents.unloaded();
    pending.resolve(okResponse(me(undefined)));
    await flushPromises();
    expect(store.user).toBeUndefined();
    expect(store.hasApplicationAccess).toBe(false);
  });

  it("remplace le profil par le refus global et purge l'impersonation sans rechargement", async () => {
    findMeMock.mockResolvedValue(deniedResponse);
    localStorage.setItem("impersonatedUserId", "target");
    const store = useUserStore();
    store.user = me({ level: "strong", downgraded: false, reason: "strong-method" }, "ADMIN");
    sessionStorage.setItem("strongReauthAttempt", "prompt");
    await store.fetchUser();
    expect(store.user).toBeUndefined();
    expect(store.authLevel).toEqual(deniedLevel);
    expect(store.isAuthDowngraded).toBe(true);
    expect(store.hasApplicationAccess).toBe(false);
    expect(store.impersonation).toBeNull();
    expect(localStorage.getItem("impersonatedUserId")).toBeNull();
    expect(reauthLoopState.value).toBe("prompt");
    expect(assignMock).not.toHaveBeenCalled();
  });

  it("un refus invalide aussi une ancienne réponse de profil encore en vol", async () => {
    const pending = deferred<ReturnType<typeof okResponse>>();
    findMeMock.mockReturnValue(pending.promise);
    const store = useUserStore();
    const fetching = store.fetchUser();
    store.requireStrongAuth(deniedLevel);
    pending.resolve(okResponse(me({ level: "strong", downgraded: false, reason: "strong-method" }, "ADMIN")));
    await fetching;
    expect(store.user).toBeUndefined();
    expect(store.isAuthDowngraded).toBe(true);
  });

  it("retire le refus uniquement après une réponse réussie de la session courante", async () => {
    const store = useUserStore();
    await Promise.resolve();
    store.authenticated = true;
    store.requireStrongAuth(deniedLevel);
    findMeMock.mockResolvedValue(okResponse(me({ level: "strong", downgraded: false, reason: "strong-method" }, "ADMIN")));
    await store.fetchUser();
    expect(store.hasApplicationAccess).toBe(true);
    expect(store.isAuthDowngraded).toBe(false);
    expect(store.user?.role).toBe("ADMIN");
  });

  it("garde la reconnexion disponible après le retrait du jeton avant redirection", () => {
    const store = useUserStore();
    store.requireStrongAuth(deniedLevel);
    oidcEvents.unloaded();
    expect(store.authenticated).toBe(false);
    expect(store.user).toBeUndefined();
    expect(store.isAuthDowngraded).toBe(true);
    expect(store.hasApplicationAccess).toBe(false);
  });

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
    oidcEvents[event](oidcSession());
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

  it.each(mutations)("propage le refus HTTP de %s sans annoncer une mutation réussie", async (mutation) => {
    const original = {
      ...me(undefined),
      emailNotificationsEnabled: false,
      followedApplications: [{ id: "app-1", label: "Application suivie" }],
    };
    const response = {
      data: { ...original, emailNotificationsEnabled: true, followedApplications: [] },
      response: { ok: false, status: 403 },
    };
    updateMeMock.mockResolvedValue(response);
    subscribeMock.mockResolvedValue(response);
    unsubscribeMock.mockResolvedValue(response);
    const store = useUserStore();
    store.user = original;

    await expect(startMutation(store, mutation)).rejects.toThrow(/a échoué/);
    expect(store.user?.emailNotificationsEnabled).toBe(false);
    expect(store.user?.followedApplications).toEqual(original.followedApplications);
  });

  it.each(mutations)("propage une réponse de %s sans données au lieu d'un faux succès", async (mutation) => {
    const response = { response: { ok: true, status: 200 } };
    updateMeMock.mockResolvedValue(response);
    subscribeMock.mockResolvedValue(response);
    unsubscribeMock.mockResolvedValue(response);
    const store = useUserStore();
    store.user = me(undefined);

    await expect(startMutation(store, mutation)).rejects.toThrow(/a échoué/);
    expect(store.user?.id).toBe("u-1");
  });

  it.each(mutations)("ignore le refus de %s provenant d'une session terminée", async (mutation) => {
    const pending = deferred<{ response: { ok: boolean; status: number } }>();
    updateMeMock.mockReturnValue(pending.promise);
    subscribeMock.mockReturnValue(pending.promise);
    unsubscribeMock.mockReturnValue(pending.promise);
    const store = useUserStore();
    store.user = me(undefined);
    const updating = startMutation(store, mutation);
    oidcEvents.unloaded();
    pending.resolve({ response: { ok: false, status: 403 } });
    await expect(updating).resolves.toBeUndefined();
    expect(store.user).toBeUndefined();
  });

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
