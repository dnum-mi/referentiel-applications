import { mount } from "@vue/test-utils";
import DataApplicationModal from "./DataApplicationModal.vue";

const { findDescriptions, createApplicationData } = vi.hoisted(() => ({
  findDescriptions: vi.fn(),
  createApplicationData: vi.fn(),
}));

vi.mock("@/api/index", () => ({
  default: {
    dataCatalogControllerFindAllDescriptions: findDescriptions,
    dataCatalogControllerCreateApplicationData: createApplicationData,
    dataSensibilityControllerFindAll: async () => ({ data: { results: [] } }),
    dataFamilyControllerFindAll: async () => ({ data: { results: [] } }),
  },
}));
vi.mock("@/stores/toasterStore", () => ({
  useToasterStore: () => ({ addErrorMessage: vi.fn(), addSuccessMessage: vi.fn() }),
}));

const description = { id: "description-1", name: "Adresse", families: [{ id: "family-1", path: "Identité" }] };

async function renderModal() {
  const wrapper = mount(DataApplicationModal, {
    shallow: true,
    props: { applicationId: "app-1", errorMessage: "" },
    global: {
      stubs: {
        DsfrModal: { template: "<div><slot /></div>" },
        DsfrInputGroup: {
          props: ["modelValue", "errorMessage"],
          emits: ["update:modelValue"],
          template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)">',
        },
      },
    },
  });
  await vi.advanceTimersByTimeAsync(0);
  return wrapper;
}

beforeEach(() => {
  vi.useFakeTimers();
  findDescriptions.mockReset();
  createApplicationData.mockReset().mockResolvedValue({ response: { ok: true } });
});
afterEach(() => vi.useRealTimers());

describe("DataApplicationModal — recherche de descriptions", () => {
  it("conserve la sélection nom + famille sans la rechercher à nouveau", async () => {
    findDescriptions.mockResolvedValue({ data: [description] });
    const wrapper = await renderModal();
    const input = wrapper.get('[data-testid="data-description-search-input"]');
    await input.setValue("Adr");
    await vi.advanceTimersByTimeAsync(300);
    await input.setValue("Adresse (Identité)");
    await vi.advanceTimersByTimeAsync(300);

    expect(findDescriptions).toHaveBeenCalledTimes(1);
    expect(wrapper.get('[data-testid="data-description-option-description-1"]').text()).toBe("Adresse (Identité)");
    await wrapper.get("form").trigger("submit");
    await vi.advanceTimersByTimeAsync(0);
    expect(createApplicationData).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({ dataDescriptionId: "description-1" }),
      }),
    );
    expect(wrapper.emitted("dataCreated")).toHaveLength(1);
    wrapper.unmount();
  });

  it("ne restaure pas la liste après effacement pendant une requête", async () => {
    let resolve!: (value: { data: (typeof description)[] }) => void;
    findDescriptions.mockImplementation(
      () =>
        new Promise((res) => {
          resolve = res;
        }),
    );
    const wrapper = await renderModal();
    const input = wrapper.get('[data-testid="data-description-search-input"]');
    await input.setValue("Adr");
    await vi.advanceTimersByTimeAsync(300);
    await input.setValue("");
    resolve({ data: [description] });
    await vi.advanceTimersByTimeAsync(300);

    expect(wrapper.findAll("option")).toHaveLength(0);
    expect(findDescriptions).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });
});
