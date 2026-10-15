import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { computed, nextTick, reactive } from "vue";
import type { ApplicationWithPerms } from "@/models/Application";
import type { HostingDto, LabelDto } from "@/client/types.gen";
import InformationsGenerales from "./InformationsGenerales.vue";

const mocks = vi.hoisted(() => ({
  fetchHostings: vi.fn(),
  resetHostings: vi.fn(),
  deleteHosting: vi.fn(),
  findLabels: vi.fn(),
  deleteLabel: vi.fn(),
  addErrorMessage: vi.fn(),
  addSuccessMessage: vi.fn(),
}));
const hosting: HostingDto = {
  id: "hosting-at",
  applicationId: "app-at",
  label: "Hébergement fictif",
  hostingOptionId: "option-at",
  isActive: true,
  hostingOption: { id: "option-at", provider: "Fournisseur AT", platform: "Plateforme AT", site: "Site AT" },
};
const hostingState = reactive({
  hostings: [hosting],
  fetchHostings: mocks.fetchHostings,
  resetHostings: mocks.resetHostings,
  deleteHosting: mocks.deleteHosting,
});
vi.mock("@/stores/hostingStore", () => ({ useHostingStore: () => hostingState }));
vi.mock("@/api/index.js", () => ({
  default: {
    labelsControllerFindAllSorted: mocks.findLabels,
    labelsControllerDelete: mocks.deleteLabel,
    applicationTechnicalDebtInfoControllerFind: async () => ({ response: { ok: true }, data: { results: [], total: 0 } }),
  },
}));
vi.mock("@/composables/use-app-permission", () => ({ useAppPermission: () => computed(() => true) }));
vi.mock("@/stores/toasterStore", () => ({
  useToasterStore: () => ({ addErrorMessage: mocks.addErrorMessage, addSuccessMessage: mocks.addSuccessMessage }),
}));
vi.mock("vue-router", () => ({ useRouter: () => ({ resolve: () => ({ fullPath: "/recherche-application" }) }) }));
vi.mock("@/router", () => ({ default: { push: vi.fn(), resolve: () => ({ fullPath: "/recherche-application" }) }, setPageTitle: vi.fn() }));

enableAutoUnmount(afterEach);
beforeEach(() => {
  vi.clearAllMocks();
  hostingState.hostings = [hosting];
  mocks.fetchHostings.mockResolvedValue(undefined);
  mocks.findLabels.mockResolvedValue({ response: { ok: true }, data: [] });
  mocks.deleteHosting.mockReset();
  mocks.deleteLabel.mockReset();
});

async function renderInfo() {
  const application: ApplicationWithPerms = {
    id: "app-at",
    label: "Application fictive",
    shortName: null,
    description: "Description",
    logo: null,
    purposes: [],
    targetPopulations: [],
    quality: null,
    tags: [],
    myPerms: new Set(),
  };
  const wrapper = mount(InformationsGenerales, {
    attachTo: document.body,
    props: { application },
    global: {
      directives: { "use-mermaid": {} },
      stubs: {
        ApplicationForm: true,
        HostingModal: {
          emits: ["close", "hostingUpdated"],
          template:
            '<dialog open data-testid="hosting-modal"><button data-testid="test-hosting-save" @click="$emit(\'hostingUpdated\')">Modifier</button><button data-testid="test-hosting-close" @click="$emit(\'close\')">Annuler</button></dialog>',
        },
        DsfrModal: { props: ["opened"], template: '<div v-if="opened" role="dialog"><slot /></div>' },
      },
    },
  });
  await flushPromises();
  return wrapper;
}

it("rend le focus au nouveau bouton de la même ligne après le rafraîchissement", async () => {
  const wrapper = await renderInfo();
  const original = wrapper.get('[data-testid="hosting-edit-btn"]');
  (original.element as HTMLButtonElement).focus();
  await original.trigger("click");
  hostingState.hostings = [];
  await nextTick();
  expect(original.element.isConnected).toBe(false);
  hostingState.hostings = [{ ...hosting, label: "Hébergement modifié" }];
  await nextTick();
  const submit = wrapper.get('[data-testid="test-hosting-save"]');
  (submit.element as HTMLButtonElement).focus();
  await submit.trigger("click");
  await flushPromises();
  expect(wrapper.find('[data-testid="hosting-modal"]').exists()).toBe(false);
  expect(wrapper.get('[data-testid="hosting-edit-btn"]').element).toHaveFocus();
});

it("rend le focus au bouton original après annulation", async () => {
  const wrapper = await renderInfo();
  const original = wrapper.get('[data-testid="hosting-edit-btn"]');
  (original.element as HTMLButtonElement).focus();
  await original.trigger("click");
  const cancel = wrapper.get('[data-testid="test-hosting-close"]');
  (cancel.element as HTMLButtonElement).focus();
  await cancel.trigger("click");
  await flushPromises();
  expect(original.element).toHaveFocus();
});

it("respecte un déplacement volontaire du focus avant la fermeture tardive", async () => {
  const wrapper = await renderInfo();
  const original = wrapper.get('[data-testid="hosting-edit-btn"]');
  (original.element as HTMLButtonElement).focus();
  await original.trigger("click");
  const outside = document.createElement("button");
  document.body.append(outside);
  outside.focus();
  await wrapper.get('[data-testid="test-hosting-save"]').trigger("click");
  await flushPromises();
  expect(outside).toHaveFocus();
  outside.remove();
});

it.each(["hosting", "label"] as const)("rend le focus à Ajouter après la suppression du dernier %s", async (kind) => {
  const label = { id: "label-at", applicationId: "app-at", value: "Nom AT" } satisfies LabelDto;
  if (kind === "label") mocks.findLabels.mockResolvedValueOnce({ response: { ok: true }, data: [label] });
  mocks.deleteHosting.mockImplementation(async () => {
    hostingState.hostings = [];
  });
  mocks.deleteLabel.mockResolvedValue({ response: { ok: true } });
  const wrapper = await renderInfo();
  const original = wrapper.get(`[data-testid="${kind}-delete-btn"]`);
  (original.element as HTMLButtonElement).focus();
  await original.trigger("click");
  const confirmation = wrapper.get('[data-testid="delete-confirm-btn"]');
  (confirmation.element as HTMLButtonElement).focus();
  await confirmation.trigger("click");
  await flushPromises();
  expect(original.element.isConnected).toBe(false);
  expect(wrapper.get(`[data-testid="info-add-${kind}-btn"]`).element).toHaveFocus();
});

it.each(["hosting", "label"] as const)("respecte le focus déplacé pendant la suppression de %s", async (kind) => {
  const label = { id: "label-at", applicationId: "app-at", value: "Nom AT" } satisfies LabelDto;
  if (kind === "label") mocks.findLabels.mockResolvedValueOnce({ response: { ok: true }, data: [label] });
  let complete = () => {};
  if (kind === "hosting")
    mocks.deleteHosting.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          complete = () => {
            hostingState.hostings = [];
            resolve();
          };
        }),
    );
  else
    mocks.deleteLabel.mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = () => resolve({ response: { ok: true } });
        }),
    );
  const wrapper = await renderInfo();
  const original = wrapper.get(`[data-testid="${kind}-delete-btn"]`);
  (original.element as HTMLButtonElement).focus();
  await original.trigger("click");
  const confirmation = wrapper.get('[data-testid="delete-confirm-btn"]');
  (confirmation.element as HTMLButtonElement).focus();
  await confirmation.trigger("click");
  const outside = document.createElement("button");
  document.body.append(outside);
  outside.focus();
  complete();
  await flushPromises();
  expect(outside).toHaveFocus();
  outside.remove();
});
