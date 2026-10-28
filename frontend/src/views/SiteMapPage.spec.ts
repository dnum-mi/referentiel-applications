import { cleanup, render, screen, waitFor } from "@testing-library/vue";
import { reactive } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { routeNames } from "@/router/route-names";
import { Permission } from "@/client";
import SiteMapPage from "./SiteMapPage.vue";

const userStore = reactive({
  authenticated: true,
  canListTechnologies: false,
  permissions: [] as Permission[],
  hasPermissions: (required: Permission[]) => required.some((permission) => userStore.permissions.includes(permission)),
});
const StubPage = { template: "<div/>" };
const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { name: routeNames.ACCUEIL, path: "/", component: StubPage, meta: { title: "Accueil" } },
    { name: routeNames.ACCESSIBILITE, path: "/accessibilite", component: StubPage, meta: { title: "Accessibilité" } },
    ...[routeNames.SIGNIN, routeNames.LOGOUT, routeNames.AUTH_CALLBACK, routeNames.AUTH_SILENT_CALLBACK].map((name) => ({
      name,
      path: `/oidc/${name}`,
      component: StubPage,
      meta: { requiresAuth: false, title: name },
    })),
    {
      name: routeNames.ADMINPAGE,
      path: "/administration",
      component: StubPage,
      meta: { requiresAuth: true, requiresAdmin: true, title: "Administration - Référentiel des applications" },
    },
    {
      name: routeNames.ENDOFLIFE,
      path: "/technologies",
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
    userStore.permissions = [];
  });
  afterEach(cleanup);

  it("propose des pages publiques, sans étapes de connexion ni de déconnexion", () => {
    userStore.authenticated = false;
    render(SiteMapPage, { global: { plugins: [router] } });
    expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(["/accessibilite", "/"]);
  });

  it.each([Permission.ADMIN_PANEL_MANAGE, Permission.QUALITY_CAMPAIGN_MANAGE, Permission.MDIT_CAMPAIGN_MANAGE])(
    "rend l'administration accessible avec la permission %s autorisée par la route",
    (permission) => {
      userStore.permissions = [permission];
      render(SiteMapPage, { global: { plugins: [router] } });
      expect(screen.getByRole("link", { name: "Administration" })).toHaveAttribute("href", "/administration");
    },
  );

  it("masque l'administration sans droit sur cette page", () => {
    render(SiteMapPage, { global: { plugins: [router] } });
    expect(screen.queryByRole("link", { name: "Administration" })).not.toBeInTheDocument();
  });

  it("masque Technologies sans autorisation", () => {
    render(SiteMapPage, { global: { plugins: [router] } });
    expect(screen.queryByRole("link", { name: "Technologies" })).not.toBeInTheDocument();
  });

  it("met à jour le lien lors de l'attribution et du retrait de l'autorisation", async () => {
    render(SiteMapPage, { global: { plugins: [router] } });
    userStore.canListTechnologies = true;
    expect(await screen.findByRole("link", { name: "Technologies" })).toHaveAttribute("href", "/technologies");
    userStore.canListTechnologies = false;
    await waitFor(() => expect(screen.queryByRole("link", { name: "Technologies" })).not.toBeInTheDocument());
  });
});
