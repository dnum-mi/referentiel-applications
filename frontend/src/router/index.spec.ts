import { routeNames } from "./route-names";
import router from "./index";

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
