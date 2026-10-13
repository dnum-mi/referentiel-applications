import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { computed, ref } from "vue";
import TechnicalDebtModal from "./TechnicalDebtModal.vue";

const mocks = vi.hoisted(() => ({ loadCampaigns: vi.fn(), save: vi.fn(), addErrorMessage: vi.fn(), addSuccessMessage: vi.fn() }));
const campaigns = ref([{ id: "campaign-at", year: 2026, name: "Campagne fictive", isActive: true }]);
vi.mock("@/composables/use-mdit-campaigns", () => ({
  useMditCampaigns: () => ({ campaigns, loadActiveCampaigns: mocks.loadCampaigns, latestYear: computed(() => campaigns.value[0]?.year) }),
}));
vi.mock("@/api/index.js", () => ({ default: { applicationTechnicalDebtInfoControllerCreate: mocks.save } }));
vi.mock("@/stores/toasterStore", () => ({
  useToasterStore: () => ({ addErrorMessage: mocks.addErrorMessage, addSuccessMessage: mocks.addSuccessMessage }),
}));
enableAutoUnmount(afterEach);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.loadCampaigns.mockResolvedValue(campaigns.value);
});

function renderModal() {
  return mount(TechnicalDebtModal, {
    attachTo: document.body,
    props: {
      applicationId: "app-at",
      initialData: {
        id: "debt-at",
        applicationId: "app-at",
        millesime: 2026,
        technicalMaturity: 3,
        businessMaturity: 4,
        costContainment: 2,
      },
    },
    global: {
      stubs: {
        DsfrModal: {
          template: '<dialog open data-testid="technical-debt-modal"><button class="fr-btn--close">Fermer</button><slot /></dialog>',
        },
      },
    },
  });
}

it("porte le focus à l'ouverture puis respecte la saisie durant le chargement des campagnes", async () => {
  let release!: (value: typeof campaigns.value) => void;
  mocks.loadCampaigns.mockReturnValueOnce(new Promise((resolve) => (release = resolve)));
  const wrapper = renderModal();
  await flushPromises();
  expect(wrapper.get(".fr-btn--close").element).toHaveFocus();
  const field = wrapper.get('[data-testid="technical-maturity-select"]');
  (field.element as HTMLInputElement).focus();
  await field.setValue("4.25");
  release(campaigns.value);
  await flushPromises();
  expect(field.element).toHaveFocus();
  expect(field.element).toHaveValue(4.25);
  expect(mocks.save).not.toHaveBeenCalled();
});

it("conserve les scores et un focus volontaire sur erreur500, sans deuxième envoi", async () => {
  let release!: (value: { response: { ok: false } }) => void;
  mocks.save.mockReturnValueOnce(new Promise((resolve) => (release = resolve)));
  const wrapper = renderModal();
  await flushPromises();
  const submit = wrapper.get('[data-testid="technical-debt-submit-btn"]');
  (submit.element as HTMLButtonElement).focus();
  await wrapper.get("form").trigger("submit");
  await wrapper.get("form").trigger("submit");
  expect(mocks.save).toHaveBeenCalledOnce();
  const field = wrapper.get('[data-testid="technical-maturity-select"]');
  (field.element as HTMLInputElement).focus();
  await field.setValue("4.25");
  release({ response: { ok: false } });
  await flushPromises();
  expect(wrapper.get('[data-testid="technical-debt-form-error"]').text()).toContain("Votre saisie est conservée");
  expect(field.element).toHaveFocus();
  expect(field.element).toHaveValue(4.25);
  expect(wrapper.emitted("saved")).toBeUndefined();
  expect(wrapper.emitted("close")).toBeUndefined();
});

it("ne reprend pas le focus après fermeture pendant le chargement des campagnes", async () => {
  let release!: (value: typeof campaigns.value) => void;
  mocks.loadCampaigns.mockReturnValueOnce(new Promise((resolve) => (release = resolve)));
  const wrapper = renderModal();
  await flushPromises();
  wrapper.unmount();
  const outside = document.createElement("button");
  document.body.append(outside);
  outside.focus();
  release(campaigns.value);
  await flushPromises();
  expect(outside).toHaveFocus();
  outside.remove();
});
