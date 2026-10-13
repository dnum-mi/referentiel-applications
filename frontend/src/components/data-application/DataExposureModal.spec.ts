import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import DataExposureModal from "./DataExposureModal.vue";

const { createExposure, addErrorMessage } = vi.hoisted(() => ({ createExposure: vi.fn(), addErrorMessage: vi.fn() }));
vi.mock("@/api/index", () => ({ default: { dataCatalogControllerCreateExposure: createExposure } }));
vi.mock("@/stores/toasterStore", () => ({ useToasterStore: () => ({ addErrorMessage, addSuccessMessage: vi.fn() }) }));
enableAutoUnmount(afterEach);
beforeEach(() => {
  createExposure.mockReset();
  addErrorMessage.mockClear();
});

function renderModal() {
  return mount(DataExposureModal, {
    attachTo: document.body,
    props: { applicationId: "app-1", dataApplicationId: "data-1", errorMessage: "" },
    global: { stubs: { DsfrModal: { template: '<div role="dialog"><button class="fr-btn--close">Fermer</button><slot /></div>' } } },
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

  it("refuse les envois concurrents et restitue l'erreur et le focus sans perdre les valeurs", async () => {
    let resolve!: (value: { response: { ok: false }; error: { message: string } }) => void;
    createExposure.mockReturnValue(new Promise((release) => (resolve = release)));
    const wrapper = renderModal();
    await wrapper.get('[data-testid="data-exposure-type-input"]').setValue("API");
    const submit = wrapper.get<HTMLButtonElement>('[data-testid="data-exposure-submit-btn"]');
    submit.element.focus();
    const submission = wrapper.get("form").trigger("submit");
    // jsdom garde le focus sur disabled ; reproduire le blur avant le rendu.
    submit.element.blur();
    await submission;
    await wrapper.get("form").trigger("submit");
    await flushPromises();
    expect(createExposure).toHaveBeenCalledTimes(1);
    expect(wrapper.get(".fr-btn--close").element).toHaveFocus();

    resolve({ response: { ok: false }, error: { message: "Service indisponible" } });
    await flushPromises();
    expect(wrapper.get('[data-testid="data-exposure-submit-error"]').element).toHaveAttribute("role", "alert");
    expect(wrapper.get('[data-testid="data-exposure-submit-error"]').text()).toContain("enregistrement de l'exposition");
    expect(wrapper.get('[data-testid="data-exposure-type-input"]').element).toHaveValue("API");
    expect(submit.element).toHaveFocus();
    expect(addErrorMessage).not.toHaveBeenCalled();
    expect(wrapper.emitted("close")).toBeUndefined();
  });

  it("respecte un déplacement volontaire du focus pendant une erreur différée", async () => {
    let resolve!: (value: { response: { ok: false } }) => void;
    createExposure.mockReturnValue(new Promise((release) => (resolve = release)));
    const wrapper = renderModal();
    await wrapper.get('[data-testid="data-exposure-type-input"]').setValue("API");
    wrapper.get<HTMLButtonElement>('[data-testid="data-exposure-submit-btn"]').element.focus();
    await wrapper.get("form").trigger("submit");
    const format = wrapper.get<HTMLInputElement>('[data-testid="data-exposure-format-input"]');
    format.element.focus();
    resolve({ response: { ok: false } });
    await flushPromises();
    expect(format.element).toHaveFocus();
    expect(wrapper.get('[data-testid="data-exposure-submit-error"]').text()).toContain("enregistrement de l'exposition");
  });

  it("annonce l'échec hors du dialogue si l'utilisateur le ferme avant la réponse", async () => {
    let resolve!: (value: { response: { ok: false } }) => void;
    createExposure.mockReturnValue(new Promise((release) => (resolve = release)));
    const wrapper = renderModal();
    await wrapper.get('[data-testid="data-exposure-type-input"]').setValue("API");
    wrapper.get<HTMLButtonElement>('[data-testid="data-exposure-submit-btn"]').element.focus();
    await wrapper.get("form").trigger("submit");
    await wrapper.get('[data-testid="data-exposure-cancel-btn"]').trigger("click");
    expect(wrapper.emitted("close")).toHaveLength(1);
    wrapper.unmount();
    const destination = document.createElement("button");
    document.body.append(destination);
    destination.focus();
    resolve({ response: { ok: false } });
    await flushPromises();
    expect(addErrorMessage).toHaveBeenCalledWith("Une erreur est survenue lors de l'enregistrement de l'exposition.");
    expect(destination).toHaveFocus();
    destination.remove();
  });
});
