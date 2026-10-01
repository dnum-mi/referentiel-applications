import { cleanup, render, screen, waitFor } from "@testing-library/vue";
import { reactive } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { routeNames } from "@/router/route-names";
import SiteMapPage from "./SiteMapPage.vue";

const userStore = reactive({ authenticated: true, canListTechnologies: false, hasPermissions: () => false });
const StubPage = { template: "<div/>" };
const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { name: routeNames.ACCUEIL, path: "/", component: StubPage, meta: { title: "Accueil" } },
    {
      name: routeNames.ENDOFLIFE,
      path: "/fins-de-vie",
      component: StubPage,
      meta: { requiresAuth: true, requiresTechnologyList: true, title: "Technologies - Référentiel des applications" },
    },
  ],
});

vi.mock("@/router", () => ({ default: { getRoutes: () => router.getRoutes() } }));
vi.mock("@/stores/userStore", () => ({ useUserStore: () => userStore }));

describe("plan du site — Technologies", () => {
  beforeEach(() => {
    userStore.authenticated = true;
    userStore.canListTechnologies = false;
  });
  afterEach(cleanup);

  it("masque Technologies sans autorisation", () => {
    render(SiteMapPage, { global: { plugins: [router] } });
    expect(screen.queryByRole("link", { name: "Technologies" })).not.toBeInTheDocument();
  });

  it("met à jour le lien lors de l'attribution et du retrait de l'autorisation", async () => {
    render(SiteMapPage, { global: { plugins: [router] } });
    userStore.canListTechnologies = true;
    expect(await screen.findByRole("link", { name: "Technologies" })).toHaveAttribute("href", "/fins-de-vie");
    userStore.canListTechnologies = false;
    await waitFor(() => expect(screen.queryByRole("link", { name: "Technologies" })).not.toBeInTheDocument());
  });
});
