import { enableAutoUnmount, mount } from "@vue/test-utils";
import DataApplicationModal from "./DataApplicationModal.vue";

const { findDescriptions, createApplicationData, createFamily, addErrorMessage } = vi.hoisted(() => ({
  findDescriptions: vi.fn(),
  createApplicationData: vi.fn(),
  createFamily: vi.fn(),
  addErrorMessage: vi.fn(),
}));

vi.mock("@/api/index", () => ({
  default: {
    dataCatalogControllerFindAllDescriptions: findDescriptions,
    dataCatalogControllerCreateApplicationData: createApplicationData,
    dataSensibilityControllerFindAll: async () => ({ data: { results: [] } }),
    dataFamilyControllerFindAll: async () => ({ data: { results: [] } }),
    dataFamilyControllerCreate: createFamily,
  },
}));
vi.mock("@/stores/toasterStore", () => ({
  useToasterStore: () => ({ addErrorMessage, addSuccessMessage: vi.fn() }),
}));

const description = { id: "description-1", name: "Adresse", families: [{ id: "family-1", path: "Identité" }] };
enableAutoUnmount(afterEach);

async function renderModal() {
  const wrapper = mount(DataApplicationModal, {
    attachTo: document.body,
    props: { applicationId: "app-1", errorMessage: "" },
    global: {
      stubs: {
        DsfrModal: { template: '<div role="dialog"><button class="fr-btn--close">Fermer</button><slot /></div>' },
        AccessibleAutocomplete: true,
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
  createFamily.mockReset();
  addErrorMessage.mockClear();
});
afterEach(() => vi.useRealTimers());

describe("DataApplicationModal — recherche de descriptions", () => {
  it("nomme la recherche, les aides et relie l'erreur au champ réellement ciblé", async () => {
    const wrapper = await renderModal();
    const input = wrapper.get('[data-testid="data-description-search-input"]');
    expect(input.element).toHaveAccessibleName(/Donnée d'application \(obligatoire\)/);
    expect(input.element).toBeRequired();
    expect(input.element).toHaveAttribute("aria-describedby", "data-description-search-tooltip-desc");
    for (const tooltip of wrapper.findAll(".fr-btn--tooltip")) expect(tooltip.element).toHaveAccessibleName();

    await wrapper.get("form").trigger("submit");
    await vi.advanceTimersByTimeAsync(0);
    expect(input.element).toHaveFocus();
    expect(input.element).toHaveAttribute("aria-invalid", "true");
    expect(input.element).toHaveAttribute("aria-describedby", "data-description-search-tooltip-desc data-description-search-error");
    expect(wrapper.get("#data-description-search-error").text()).toContain("Veuillez sélectionner une donnée existante");
    expect(createApplicationData).not.toHaveBeenCalled();
  });

  it("affiche les erreurs de nom et de famille, avec focus, sans perdre la saisie", async () => {
    const wrapper = await renderModal();
    await wrapper.get('[data-testid="data-application-create-description-toggle"]').trigger("click");
    const name = wrapper.get('[data-testid="new-description-name-input"]');
    expect(name.element).toHaveAccessibleName(/Nom de la donnée \(obligatoire\)/);
    expect(name.element).toHaveFocus();
    await name.setValue("   ");
    await wrapper.get("form").trigger("submit");
    await vi.advanceTimersByTimeAsync(0);
    expect(name.element).toHaveFocus();
    expect(name.element).toHaveAttribute("aria-invalid", "true");
    expect(name.element).toHaveAttribute("aria-describedby", "new-description-name-tooltip-desc new-description-name-error");
    expect(wrapper.get("#new-description-name-error").text()).toBe("Veuillez renseigner un nom.");

    await name.setValue("Adresse postale");
    await wrapper.get('[data-testid="new-description-create-family-toggle"]').trigger("click");
    const family = wrapper.get('[data-testid="new-family-path-input"]');
    expect(family.element).toHaveFocus();
    await wrapper.get('[data-testid="new-family-add-btn"]').trigger("click");
    expect(family.element).toHaveFocus();
    expect(family.element).toHaveAttribute("aria-invalid", "true");
    expect(family.element).toHaveAttribute("aria-describedby", "new-family-path-error");
    expect(wrapper.get("#new-family-path-error").text()).toBe("Veuillez renseigner un chemin de famille.");
    expect(name.element).toHaveValue("Adresse postale");
    expect(createFamily).not.toHaveBeenCalled();
    expect(createApplicationData).not.toHaveBeenCalled();
  });

  it("garde un nom pendant l'enregistrement", async () => {
    findDescriptions.mockResolvedValue({ data: [description] });
    createApplicationData.mockReturnValue(new Promise(() => {}));
    const wrapper = await renderModal();
    await wrapper.get('[data-testid="data-description-search-input"]').setValue("Adresse (Identité)");
    await vi.advanceTimersByTimeAsync(300);
    await wrapper.get("form").trigger("submit");
    await vi.advanceTimersByTimeAsync(0);
    expect(wrapper.get('[data-testid="data-application-submit-btn"]').element).toHaveAccessibleName("Rattacher");
    expect(wrapper.get('[data-testid="data-application-submit-btn"]').element).toBeDisabled();
  });

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

    expect(wrapper.findAll("#dataDescriptionsList option")).toHaveLength(0);
    expect(findDescriptions).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it("garde le brouillon et le focus après un refus API, avec un seul appel et une alerte locale", async () => {
    findDescriptions.mockResolvedValue({ data: [description] });
    let resolve!: (value: { response: { ok: false } }) => void;
    createApplicationData.mockReturnValue(new Promise((release) => (resolve = release)));
    const wrapper = await renderModal();
    const descriptionInput = wrapper.get('[data-testid="data-description-search-input"]');
    await descriptionInput.setValue("Adresse (Identité)");
    await vi.advanceTimersByTimeAsync(300);
    const submit = wrapper.get<HTMLButtonElement>('[data-testid="data-application-submit-btn"]');
    submit.element.focus();
    const submission = wrapper.get("form").trigger("submit");
    // jsdom garde le focus sur disabled ; reproduire le blur avant le rendu.
    submit.element.blur();
    await submission;
    await wrapper.get("form").trigger("submit");
    await vi.advanceTimersByTimeAsync(0);
    expect(createApplicationData).toHaveBeenCalledTimes(1);
    expect(wrapper.get(".fr-btn--close").element).toHaveFocus();
    resolve({ response: { ok: false } });
    await vi.advanceTimersByTimeAsync(0);
    expect(wrapper.get('[data-testid="data-application-submit-error"]').element).toHaveAttribute("role", "alert");
    expect(wrapper.get('[data-testid="data-application-submit-error"]').text()).toContain("enregistrement de la donnée");
    expect(descriptionInput.element).toHaveValue("Adresse (Identité)");
    expect(submit.element).toHaveFocus();
    expect(addErrorMessage).not.toHaveBeenCalled();
    expect(wrapper.emitted("close")).toBeUndefined();
  });

  it("respecte le focus choisi dans un champ pendant l'attente", async () => {
    findDescriptions.mockResolvedValue({ data: [description] });
    let resolve!: (value: { response: { ok: false } }) => void;
    createApplicationData.mockReturnValue(new Promise((release) => (resolve = release)));
    const wrapper = await renderModal();
    await wrapper.get('[data-testid="data-description-search-input"]').setValue("Adresse (Identité)");
    await vi.advanceTimersByTimeAsync(300);
    wrapper.get<HTMLButtonElement>('[data-testid="data-application-submit-btn"]').element.focus();
    await wrapper.get("form").trigger("submit");
    const example = wrapper.get<HTMLInputElement>('[data-testid="data-application-example-input"]');
    example.element.focus();
    resolve({ response: { ok: false } });
    await vi.advanceTimersByTimeAsync(0);
    expect(example.element).toHaveFocus();
  });

  it("garde une annonce globale après fermeture, sans reprendre le focus", async () => {
    findDescriptions.mockResolvedValue({ data: [description] });
    let resolve!: (value: { response: { ok: false } }) => void;
    createApplicationData.mockReturnValue(new Promise((release) => (resolve = release)));
    const wrapper = await renderModal();
    await wrapper.get('[data-testid="data-description-search-input"]').setValue("Adresse (Identité)");
    await vi.advanceTimersByTimeAsync(300);
    wrapper.get<HTMLButtonElement>('[data-testid="data-application-submit-btn"]').element.focus();
    await wrapper.get("form").trigger("submit");
    await wrapper.get('[data-testid="data-application-cancel-btn"]').trigger("click");
    expect(wrapper.emitted("close")).toHaveLength(1);
    wrapper.unmount();
    const destination = document.createElement("button");
    document.body.append(destination);
    destination.focus();
    resolve({ response: { ok: false } });
    await vi.advanceTimersByTimeAsync(0);
    expect(addErrorMessage).toHaveBeenCalledWith("Une erreur est survenue lors de l'enregistrement de la donnée.");
    expect(destination).toHaveFocus();
    destination.remove();
  });
});
