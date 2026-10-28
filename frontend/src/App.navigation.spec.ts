import { enableAutoUnmount, flushPromises, shallowMount } from "@vue/test-utils";
import { defineComponent } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import App from "./App.vue";
import { routeNames } from "./router/route-names";

const { session } = vi.hoisted(() => ({
  session: {
    user: { id: "user-1" },
    authenticated: false,
    sessionInitialized: true,
    hasApplicationAccess: false,
    canListTechnologies: false,
    hasPermissions: () => false,
  },
}));

vi.mock("@/stores/userStore", () => ({ useUserStore: () => session }));
vi.mock("@/stores/notificationStore", () => ({ useNotificationStore: () => ({ emailPreview: null }) }));
vi.mock("@/stores/toasterStore", () => ({ useToasterStore: () => ({ messages: [] }) }));
vi.mock("@/services/authentication", () => ({
  USER_MANAGER: { getUser: vi.fn().mockResolvedValue({}), signinRedirect: vi.fn() },
  resumeStrongReauthAfterLogout: vi.fn().mockResolvedValue(false),
}));
vi.mock("@/services/config", () => ({ getConfig: vi.fn().mockResolvedValue({}) }));
vi.mock("@/api/init-clients", () => ({ configureClients: vi.fn() }));
vi.mock("@/composables/use-app-update", () => ({ useAppUpdate: () => ({ needRefresh: false, updateServiceWorker: vi.fn() }) }));
vi.mock("@/composables/use-notification-polling", () => ({ useNotificationPolling: vi.fn() }));
vi.mock("@/composables/use-maintenance-mode", () => ({ useMaintenanceMode: () => ({ maintenanceMode: false }) }));

enableAutoUnmount(afterEach);

async function renderApp() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", name: routeNames.ACCUEIL, component: { template: "<h1>Accueil</h1>" } }],
  });
  await router.push("/");
  const wrapper = shallowMount(App, {
    global: {
      plugins: [router],
      stubs: { DsfrHeader: defineComponent({ template: '<header><slot name="mainnav" /></header>' }), RouterView: false },
    },
  });
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  Object.assign(session, { authenticated: false, sessionInitialized: true, hasApplicationAccess: false, canListTechnologies: false });
});

it.each([false, true])("retire le bandeau public et son lien d'évitement, session initialisée = %s", async (initialized) => {
  session.sessionInitialized = initialized;
  const wrapper = await renderApp();

  expect(wrapper.find('[data-testid="main-header"]').exists()).toBe(true);
  expect(wrapper.find('[data-testid="main-navigation"]').exists()).toBe(false);
  expect(wrapper.findComponent({ name: "DsfrSkipLinks" }).props("links")).not.toContainEqual(expect.objectContaining({ id: "header-nav" }));
  expect(wrapper.findComponent({ name: "DsfrFooter" }).props("mandatoryLinks")).toContainEqual(
    expect.objectContaining({ to: { name: routeNames.ACCESSIBILITE } }),
  );
});

it("conserve le menu métier et son lien d'évitement après validation de l'accès", async () => {
  Object.assign(session, { authenticated: true, hasApplicationAccess: true });
  const wrapper = await renderApp();

  const navigation = wrapper.getComponent({ name: "DsfrNavigation" });
  expect(navigation.props("navItems")).toContainEqual({ to: { name: routeNames.SEARCHAPP }, text: "Applications" });
  expect(wrapper.findComponent({ name: "DsfrSkipLinks" }).props("links")).toContainEqual({
    id: "header-nav",
    text: "Aller à la navigation",
  });
});

it("n'affiche pas le menu métier d'une session authentifiée sans accès à l'application", async () => {
  session.authenticated = true;
  const wrapper = await renderApp();
  expect(wrapper.find('[data-testid="main-navigation"]').exists()).toBe(false);
});
