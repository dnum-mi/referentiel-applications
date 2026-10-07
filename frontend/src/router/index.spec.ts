import { routeNames } from "./route-names";
import router, { isTabNavigation, setPageTitle } from "./index";

const { userStore } = vi.hoisted(() => ({
  userStore: {
    user: { id: "user-1" },
    canListTechnologies: false,
    isAuthDowngraded: false,
    fetchUser: vi.fn(),
    hasPermissions: vi.fn().mockReturnValue(false),
  },
}));

vi.mock("@/stores/userStore", () => ({ useUserStore: () => userStore }));
vi.mock("@/services/authentication", () => ({
  USER_MANAGER: { getUser: vi.fn().mockResolvedValue({}), signinRedirect: vi.fn() },
  resumeStrongReauthAfterLogout: vi.fn().mockResolvedValue(false),
}));
vi.mock("@/views/HomePage.vue", () => ({ default: { template: "<div>Accueil</div>" } }));
vi.mock("@/views/ApplicationPage.vue", () => ({ default: { template: "<div>Fiche</div>" } }));
vi.mock("@/views/EndOfLifePage.vue", () => ({ default: { template: "<div>Technologies</div>" } }));

describe("route Technologies — accès direct", () => {
  beforeEach(async () => {
    userStore.canListTechnologies = false;
    await router.replace({ name: routeNames.ACCUEIL });
  });

  it("refuse l'URL directe sans l'autorisation de consultation", async () => {
    await router.push("/fins-de-vie");
    expect(router.currentRoute.value.name).toBe(routeNames.ACCUEIL);
  });

  it("ouvre l'URL directe avec l'autorisation de consultation", async () => {
    userStore.canListTechnologies = true;
    await router.push("/fins-de-vie");
    expect(router.currentRoute.value.name).toBe(routeNames.ENDOFLIFE);
  });

  it("revérifie l'autorisation lors d'une nouvelle navigation après révocation", async () => {
    userStore.canListTechnologies = true;
    await router.push("/fins-de-vie");
    await router.push({ name: routeNames.ACCUEIL });
    userStore.canListTechnologies = false;
    await router.push("/fins-de-vie");
    expect(router.currentRoute.value.name).toBe(routeNames.ACCUEIL);
  });
});

describe("fiche application — changement d'onglet (RGAA 8.6)", () => {
  beforeEach(async () => {
    await router.replace({ name: routeNames.ACCUEIL });
  });

  it("conserve le titre portant le nom de l'application lors d'un changement d'onglet", async () => {
    await router.push({ name: routeNames.PROFILEAPP, params: { id: "app-1", tab: "tab-infos" } });
    setPageTitle("Profil d'application : Mon appli");
    await router.replace({ name: routeNames.PROFILEAPP, params: { id: "app-1", tab: "tab-links" } });
    expect(document.title).toBe("Profil d'application : Mon appli - Référentiel des applications");
  });

  it("remet le titre par défaut en changeant d'application", async () => {
    await router.push({ name: routeNames.PROFILEAPP, params: { id: "app-1", tab: "tab-infos" } });
    setPageTitle("Profil d'application : Mon appli");
    await router.push({ name: routeNames.PROFILEAPP, params: { id: "app-2", tab: "tab-infos" } });
    expect(document.title).toBe("Profil d'application - Référentiel des applications");
  });
});

describe("isTabNavigation (RGAA 7.1 / 12.8 : pas de reprise du focus)", () => {
  const resolve = (id: string, tab?: string) => router.resolve({ name: routeNames.PROFILEAPP, params: { id, tab } });

  it("reconnaît un changement d'onglet sur la même fiche", () => {
    expect(isTabNavigation(resolve("app-1", "tab-links"), resolve("app-1", "tab-infos"))).toBe(true);
    expect(isTabNavigation(resolve("app-1", "tab-links"), resolve("app-1"))).toBe(true);
  });

  it("ne confond pas avec un changement de fiche ou de page", () => {
    expect(isTabNavigation(resolve("app-2", "tab-infos"), resolve("app-1", "tab-infos"))).toBe(false);
    expect(isTabNavigation(resolve("app-1", "tab-infos"), router.resolve({ name: routeNames.ACCUEIL }))).toBe(false);
  });
});
