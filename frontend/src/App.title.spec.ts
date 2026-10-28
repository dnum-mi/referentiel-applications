import { enableAutoUnmount, flushPromises, shallowMount } from "@vue/test-utils";
import { defineComponent, onMounted, ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import App from "./App.vue";

const session = vi.hoisted(() => ({
  user: { id: "user-1" },
  authenticated: true,
  sessionInitialized: true,
  hasApplicationAccess: true,
  hasPermissions: () => false,
}));
vi.mock("@/stores/userStore", () => ({ useUserStore: () => session }));
beforeEach(() => {
  session.authenticated = true;
  session.hasApplicationAccess = true;
});
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
  let finishLoading!: () => void;
  const loaded = new Promise<void>((resolve) => {
    finishLoading = resolve;
  });
  const application = defineComponent({
    name: "DeferredApplication",
    setup() {
      const label = ref("");
      onMounted(async () => {
        await loaded;
        label.value = "QA-GROUP-PARENT";
        document.title = `Profil d'application : ${label.value} - Référentiel des applications`;
      });
      return { label };
    },
    template: '<h1>{{ label }}</h1><input aria-label="Filtrer la fiche" />',
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "home", component: { template: "<h1>Accueil</h1>" } },
      { path: "/applications/:id/:tab?", name: "application", component: application, meta: { tabParam: "tab" } },
    ],
  });
  router.afterEach((to, from) => {
    if (to.name === from.name && to.params.id === from.params.id) return;
    document.title = to.name === "application" ? "Profil d'application - Référentiel des applications" : "Accueil";
  });
  await router.push("/");
  const wrapper = shallowMount(App, {
    attachTo: document.body,
    global: {
      plugins: [router],
      stubs: { RouterView: false, DeferredApplication: false, DsfrHeader: { template: '<header><slot name="mainnav" /></header>' } },
    },
  });
  await flushPromises();
  await router.push("/applications/app-1/tab-infos");
  await flushPromises();
  return { wrapper, router, finishLoading };
}

it("actualise l'annonceur lorsque le titre de la fiche arrive après la navigation", async () => {
  const { wrapper, finishLoading } = await renderApp();
  const announcer = wrapper.get('[data-testid="page-title-announcer"]');
  expect(announcer.element).toHaveFocus();
  expect(announcer.text()).toBe("Profil d'application - Référentiel des applications");

  finishLoading();
  await flushPromises();

  expect(document.title).toBe("Profil d'application : QA-GROUP-PARENT - Référentiel des applications");
  expect(announcer.text()).toBe(document.title);
  expect(wrapper.findAll("h1")).toHaveLength(1);
});

it("met à jour le texte sans reprendre le focus et le conserve sur les changements de filtre ou d'onglet", async () => {
  const { wrapper, router, finishLoading } = await renderApp();
  const input = wrapper.get<HTMLInputElement>("input");
  input.element.focus();

  finishLoading();
  await flushPromises();
  expect(wrapper.get('[data-testid="page-title-announcer"]').text()).toBe(document.title);
  expect(input.element).toHaveFocus();

  await router.replace("/applications/app-1/tab-infos?filtre=test");
  await flushPromises();
  expect(input.element).toHaveFocus();
  await router.push("/applications/app-1/tab-links");
  await flushPromises();
  expect(input.element).toHaveFocus();
});

it.each([false, true])("affiche la navigation seulement avec un accès applicatif, connecté = %s (#3101)", async (authenticated) => {
  session.authenticated = authenticated;
  session.hasApplicationAccess = authenticated;
  const { wrapper } = await renderApp();
  expect(wrapper.find('[data-testid="main-navigation"]').exists()).toBe(authenticated);
});
