import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { computed } from "vue";
import type { ApplicationStatusDto } from "@/client/types.gen";
import type { ApplicationWithPerms } from "@/models/Application";
import StatusTab from "./StatusTab.vue";

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  update: vi.fn(),
  fetchApplication: vi.fn(),
  addSuccessMessage: vi.fn(),
  addErrorMessage: vi.fn(),
}));
vi.mock("@/api/index", () => ({ default: { statusesControllerFind: mocks.find, statusesControllerUpdate: mocks.update } }));
vi.mock("@/stores/applicationStore", () => ({ useApplicationStore: () => ({ fetchApplication: mocks.fetchApplication }) }));
vi.mock("@/stores/toasterStore", () => ({
  useToasterStore: () => ({ addSuccessMessage: mocks.addSuccessMessage, addErrorMessage: mocks.addErrorMessage }),
}));
vi.mock("@/composables/use-app-permission", () => ({ useAppPermission: () => computed(() => true) }));
const status: ApplicationStatusDto = {
  id: "status-at",
  applicationId: "app-at",
  status: "in_production",
  statusDate: new Date("2026-01-01T00:00:00.000Z"),
  version: "Version initiale",
};
enableAutoUnmount(afterEach);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.find.mockReset().mockResolvedValue({ response: { ok: true }, data: [status] });
  mocks.update.mockReset().mockResolvedValue({ response: { ok: true } });
  mocks.fetchApplication.mockReset().mockResolvedValue(undefined);
});

async function renderStatuses() {
  const application: ApplicationWithPerms = {
    id: "app-at",
    label: "Application fictive",
    description: "Description",
    shortName: null,
    logo: null,
    purposes: [],
    targetPopulations: [],
    quality: null,
    myPerms: new Set(),
  };
  const wrapper = mount(StatusTab, {
    attachTo: document.body,
    props: { application },
    global: {
      stubs: {
        RefAppTable: {
          props: ["items"],
          template: '<div><div v-for="row in items" :key="row.id"><slot name="body-Actions" :data="row" /></div></div>',
        },
        DsfrModal: { props: ["opened"], template: '<dialog v-if="opened" open><slot /></dialog>' },
        StatusForm: {
          inheritAttrs: false,
          emits: ["submit"],
          template:
            "<button data-testid=\"test-status-save\" @click=\"$emit('submit', {status:'in_production',version:'Version modifiée'})\">Enregistrer</button>",
        },
      },
    },
  });
  await flushPromises();
  return wrapper;
}

it("retrouve le bouton d'édition de la même ligne après un enregistrement et rechargement", async () => {
  const wrapper = await renderStatuses();
  const original = wrapper.get('[data-testid="status-edit-btn"]');
  (original.element as HTMLButtonElement).focus();
  await original.trigger("click");
  let release!: (value: { response: { ok: true }; data: ApplicationStatusDto[] }) => void;
  mocks.find.mockReturnValueOnce(new Promise((resolve) => (release = resolve)));
  const submit = wrapper.get('[data-testid="test-status-save"]');
  (submit.element as HTMLButtonElement).focus();
  await submit.trigger("click");
  await flushPromises();
  expect(original.element.isConnected).toBe(false);
  release({ response: { ok: true }, data: [{ ...status, version: "Version modifiée" }] });
  await flushPromises();
  expect(wrapper.get('[data-testid="status-edit-btn"]').element).toHaveFocus();
  expect(mocks.update).toHaveBeenCalledOnce();
  expect(mocks.addSuccessMessage).toHaveBeenCalledWith("Statut modifié avec succès");
});

it("ne reprend pas le focus déplacé volontairement pendant le rechargement", async () => {
  const wrapper = await renderStatuses();
  const original = wrapper.get('[data-testid="status-edit-btn"]');
  (original.element as HTMLButtonElement).focus();
  await original.trigger("click");
  let release!: (value: { response: { ok: true }; data: ApplicationStatusDto[] }) => void;
  mocks.find.mockReturnValueOnce(new Promise((resolve) => (release = resolve)));
  const submit = wrapper.get('[data-testid="test-status-save"]');
  (submit.element as HTMLButtonElement).focus();
  await submit.trigger("click");
  await flushPromises();
  const outside = document.createElement("button");
  document.body.append(outside);
  outside.focus();
  release({ response: { ok: true }, data: [status] });
  await flushPromises();
  expect(outside).toHaveFocus();
  outside.remove();
});
