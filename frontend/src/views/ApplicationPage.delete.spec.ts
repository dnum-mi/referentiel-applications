import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import type { APP_PERMISSIONS } from "@/models/Application";
import ApplicationPage from "./ApplicationPage.vue";

const { removeApplication, fetchApplication } = vi.hoisted(() => ({ removeApplication: vi.fn(), fetchApplication: vi.fn() }));
vi.mock("@/router", () => ({ setPageTitle: vi.fn(), default: { push: vi.fn() } }));
vi.mock("@/stores/applicationStore", () => ({
  useApplicationStore: () => ({
    applicationsById: { "app-1": { id: "app-1", label: "Application de test", myPerms: new Set<APP_PERMISSIONS>(["AppRead"]) } },
    fetchApplication,
    deleteApplication: removeApplication,
  }),
}));
vi.mock("@/stores/metadataStore", () => ({
  useMetadataStore: () => ({
    metadataApplicationId: null,
    firstMetadata: null,
    lastMetadata: null,
    getFirstAndLastMetadataByApplication: vi.fn(),
    resetFirstAndLastMetadata: vi.fn(),
  }),
}));
vi.mock("@/stores/userStore", () => ({ useUserStore: () => ({ isSubscribed: () => false, hasPermissions: () => true }) }));
vi.mock("@/stores/toasterStore", () => ({ useToasterStore: () => ({ addErrorMessage: vi.fn(), addSuccessMessage: vi.fn() }) }));
vi.mock("@/stores/relationStore", () => ({ useRelationStore: () => ({ relationsAsTarget: [], fetchRelationsByApplication: vi.fn() }) }));
enableAutoUnmount(afterEach);
beforeEach(() => {
  removeApplication.mockReset();
  fetchApplication.mockReset();
});

async function renderPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/applications/:id", component: { template: "<div />" } }],
  });
  await router.push("/applications/app-1");
  const wrapper = mount(ApplicationPage, {
    attachTo: document.body,
    global: {
      plugins: [router],
      stubs: {
        ApplicationOverview: true,
        ApplicationProductExport: true,
        AppLoader: true,
        DsfrModal: {
          props: ["opened", "actions"],
          template:
            '<div v-if="opened" role="dialog"><button class="fr-btn--close" @click="$emit(\'close\')">Fermer</button><slot /><button v-for="action in actions" :key="action.label" :disabled="action.disabled" @click="action.onClick">{{ action.label }}</button></div>',
        },
      },
    },
  });
  await flushPromises();
  await wrapper.get('[data-testid="application-delete-btn"]').trigger("click");
  return wrapper;
}

it("exige le nom affiché, garde l'annulation sans requête et efface la confirmation à la réouverture", async () => {
  const wrapper = await renderPage();
  const name = wrapper.get('[data-testid="application-delete-input"]');
  await name.setValue("Autre nom");
  const confirm = wrapper.findAll("button").find((button) => button.text() === "Supprimer définitivement")!;
  expect(confirm.element).toBeDisabled();
  await confirm.trigger("click");
  expect(removeApplication).not.toHaveBeenCalled();
  await wrapper
    .findAll("button")
    .find((button) => button.text() === "Annuler")!
    .trigger("click");
  expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
  await wrapper.get('[data-testid="application-delete-btn"]').trigger("click");
  expect(wrapper.get('[data-testid="application-delete-input"]').element).toHaveValue("");
});

it("préserve la confirmation et une erreur locale après un refus, bloque l'envoi concurrent et permet le réessai", async () => {
  let reject!: (reason: Error) => void;
  removeApplication.mockReturnValue(new Promise((_resolve, refuse) => (reject = refuse)));
  const wrapper = await renderPage();
  const name = wrapper.get('[data-testid="application-delete-input"]');
  await name.setValue("Application de test");
  const confirm = wrapper.findAll("button").find((button) => button.text() === "Supprimer définitivement")!;
  (confirm.element as HTMLButtonElement).focus();
  const pending = confirm.trigger("click");
  (confirm.element as HTMLButtonElement).blur();
  await pending;
  await confirm.trigger("click");
  expect(removeApplication).toHaveBeenCalledExactlyOnceWith("app-1");
  expect(wrapper.get('[role="dialog"] .fr-btn--close').element).toHaveFocus();
  reject(new Error("Suppression refusée"));
  await flushPromises();
  expect(wrapper.get('[data-testid="application-delete-error"]').element).toHaveAttribute("role", "alert");
  expect(wrapper.get('[data-testid="application-delete-error"]').text()).toBe("Suppression refusée");
  expect(name.element).toHaveValue("Application de test");
  expect(confirm.element).toHaveFocus();
  expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
  removeApplication.mockResolvedValue(undefined);
  await confirm.trigger("click");
  await flushPromises();
  expect(removeApplication).toHaveBeenCalledTimes(2);
  expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
});

it("respecte la fermeture et le focus extérieur si le refus arrive après l'annulation", async () => {
  let reject!: (reason: Error) => void;
  removeApplication.mockReturnValue(new Promise((_resolve, refuse) => (reject = refuse)));
  const wrapper = await renderPage();
  await wrapper.get('[data-testid="application-delete-input"]').setValue("Application de test");
  await wrapper
    .findAll("button")
    .find((button) => button.text() === "Supprimer définitivement")!
    .trigger("click");
  await wrapper.get('[role="dialog"] .fr-btn--close').trigger("click");
  const opener = wrapper.get<HTMLButtonElement>('[data-testid="application-delete-btn"]');
  opener.element.focus();
  reject(new Error("Suppression refusée"));
  await flushPromises();
  expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
  expect(opener.element).toHaveFocus();
});
