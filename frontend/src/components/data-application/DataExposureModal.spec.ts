import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import DataExposureModal from "./DataExposureModal.vue";

const { createExposure } = vi.hoisted(() => ({ createExposure: vi.fn() }));
vi.mock("@/api/index", () => ({ default: { dataCatalogControllerCreateExposure: createExposure } }));
vi.mock("@/stores/toasterStore", () => ({ useToasterStore: () => ({ addErrorMessage: vi.fn(), addSuccessMessage: vi.fn() }) }));
enableAutoUnmount(afterEach);
beforeEach(() => {
  createExposure.mockReset();
});

function renderModal() {
  return mount(DataExposureModal, {
    attachTo: document.body,
    props: { applicationId: "app-1", dataApplicationId: "data-1", errorMessage: "" },
    global: { stubs: { DsfrModal: { template: "<div><slot /></div>" } } },
  });
}

describe("DataExposureModal — validation accessible", () => {
  it("expose l'obligation, les aides et l'erreur de type puis cible le champ refusé", async () => {
    const wrapper = renderModal();
    const type = wrapper.get('[data-testid="data-exposure-type-input"]');
    expect(type.element).toHaveAccessibleName(/Type \(obligatoire\)/);
    expect(type.element).toBeRequired();
    expect(type.element).toHaveAttribute("aria-describedby", "data-exposure-type-tooltip-desc");
    for (const tooltip of wrapper.findAll(".fr-btn--tooltip")) expect(tooltip.element).toHaveAccessibleName();
    expect(wrapper.get('[data-testid="data-exposure-format-input"]').element).toHaveAttribute(
      "aria-describedby",
      "data-exposure-format-tooltip-desc",
    );

    await type.setValue("   ");
    await wrapper.get("form").trigger("submit");
    await flushPromises();
    expect(type.element).toHaveFocus();
    expect(type.element).toHaveAttribute("aria-invalid", "true");
    expect(type.element).toHaveAttribute("aria-describedby", "data-exposure-type-tooltip-desc data-exposure-type-error");
    expect(wrapper.get("#data-exposure-type-error").text()).toBe("Veuillez renseigner un type d'exposition.");
    expect(createExposure).not.toHaveBeenCalled();
  });

  it("retire l'erreur et garde un bouton nommé pendant la sauvegarde", async () => {
    createExposure.mockReturnValue(new Promise(() => {}));
    const wrapper = renderModal();
    const type = wrapper.get('[data-testid="data-exposure-type-input"]');
    await wrapper.get("form").trigger("submit");
    await flushPromises();
    await type.setValue("API");
    await wrapper.get("form").trigger("submit");
    await flushPromises();
    expect(type.element).not.toHaveAttribute("aria-invalid");
    expect(wrapper.find("#data-exposure-type-error").exists()).toBe(false);
    const submit = wrapper.get('[data-testid="data-exposure-submit-btn"]');
    expect(submit.element).toHaveAccessibleName("Ajouter");
    expect(submit.element).toBeDisabled();
    expect(createExposure).toHaveBeenCalledWith(expect.objectContaining({ body: expect.objectContaining({ type: "API" }) }));
  });
});
