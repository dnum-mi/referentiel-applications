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

it("annonce un échec de chargement et permet un réessai sans perdre les scores", async () => {
  let reject!: (error: Error) => void;
  mocks.loadCampaigns.mockReturnValueOnce(
    new Promise((_, fail) => {
      reject = fail;
    }),
  );
  const wrapper = renderModal();
  await flushPromises();
  const field = wrapper.get<HTMLInputElement>('[data-testid="technical-maturity-select"]');
  field.element.focus();
  await field.setValue("4.25");
  reject(new DOMException("The operation timed out.", "TimeoutError"));
  await flushPromises();
  expect(wrapper.get('[data-testid="technical-debt-campaigns-error"]').text()).toContain("Impossible de charger les campagnes");
  expect(field.element).toHaveFocus();
  expect(field.element).toHaveValue(4.25);
  let release!: () => void;
  mocks.loadCampaigns.mockReturnValueOnce(
    new Promise<void>((resolve) => {
      release = resolve;
    }),
  );
  const retry = wrapper.get<HTMLButtonElement>('[data-testid="technical-debt-campaigns-retry"]');
  retry.element.focus();
  await retry.trigger("click");
  await retry.trigger("click");
  expect(mocks.loadCampaigns).toHaveBeenCalledTimes(2);
  expect(retry.element).toHaveAttribute("aria-disabled", "true");
  release();
  await flushPromises();
  expect(wrapper.find('[data-testid="technical-debt-campaigns-retry"]').exists()).toBe(false);
  expect(wrapper.get('[data-testid="millesime-select"]').element).toHaveFocus();
  expect(field.element).toHaveValue(4.25);
});

it("respecte le focus déplacé pendant le réessai des campagnes", async () => {
  mocks.loadCampaigns.mockRejectedValueOnce(new Error("hors ligne"));
  const wrapper = renderModal();
  await flushPromises();
  let release!: () => void;
  mocks.loadCampaigns.mockReturnValueOnce(
    new Promise<void>((resolve) => {
      release = resolve;
    }),
  );
  const retry = wrapper.get<HTMLButtonElement>('[data-testid="technical-debt-campaigns-retry"]');
  retry.element.focus();
  await retry.trigger("click");
  const field = wrapper.get<HTMLInputElement>('[data-testid="technical-maturity-select"]');
  field.element.focus();
  release();
  await flushPromises();
  expect(field.element).toHaveFocus();
});

it("rétablit la soumission après un délai réseau dépassé et garde le brouillon", async () => {
  mocks.save.mockRejectedValueOnce(new DOMException("The operation timed out.", "TimeoutError"));
  const wrapper = renderModal();
  await flushPromises();
  const field = wrapper.get<HTMLInputElement>('[data-testid="technical-maturity-select"]');
  await field.setValue("4.25");
  const submit = wrapper.get<HTMLButtonElement>('[data-testid="technical-debt-submit-btn"]');
  submit.element.focus();
  await wrapper.get("form").trigger("submit");
  await flushPromises();
  expect(submit.element).not.toBeDisabled();
  expect(submit.element).toHaveFocus();
  expect(wrapper.get('[data-testid="technical-debt-form-error"]').text()).toContain("Votre saisie est conservée");
  expect(field.element).toHaveValue(4.25);
  expect(wrapper.emitted("close")).toBeUndefined();
});
