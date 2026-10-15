import { createPinia } from "pinia";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import type { SavedFilterDto } from "@/client/types.gen";
import SavedFiltersPanel from "./SavedFiltersPanel.vue";

const { findAll, remove, create, setFilter } = vi.hoisted(() => ({
  findAll: vi.fn(),
  remove: vi.fn(),
  create: vi.fn(),
  setFilter: vi.fn(),
}));

vi.mock("@/api/index", () => ({
  default: { savedFilterControllerFindAll: findAll, savedFilterControllerRemove: remove, savedFilterControllerCreate: create },
}));
vi.mock("@/composables/use-application-search", () => ({
  DEFAULT_FILTERS: {},
  useApplicationSearch: () => ({ filters: { value: { actorEmail: "personne@example.test" } }, setFilter }),
}));
vi.mock("@/stores/toasterStore", () => ({ useToasterStore: () => ({ addErrorMessage: vi.fn(), addSuccessMessage: vi.fn() }) }));

const savedFilters = [
  { id: "filter-1", name: "Mes contacts", filters: { actorEmail: "personne@example.test" }, createdAt: new Date("2026-10-12") },
  { id: "filter-2", name: "Mes abonnements", filters: { subscribersEmail: true }, createdAt: new Date("2026-10-12") },
] satisfies SavedFilterDto[];

enableAutoUnmount(afterEach);

async function renderPanel() {
  const wrapper = mount(SavedFiltersPanel, {
    attachTo: document.body,
    global: {
      plugins: [createPinia()],
      stubs: {
        VIcon: true,
        Teleport: true,
        DsfrModal: { props: ["opened"], template: '<section v-if="opened" role="dialog"><slot /><slot name="footer" /></section>' },
      },
    },
  });
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  findAll.mockReset().mockResolvedValue({ data: savedFilters, response: { ok: true } });
  remove.mockReset().mockResolvedValue({ response: { ok: true } });
  create.mockReset().mockResolvedValue({ data: { ...savedFilters[0], id: "new-filter", name: "Nouveau" }, response: { ok: true } });
  setFilter.mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe("SavedFiltersPanel — confirmation de suppression", () => {
  it("garde le filtre et le focus sans requête après refus", async () => {
    const confirm = vi.spyOn(globalThis, "confirm").mockReturnValue(false);
    const wrapper = await renderPanel();
    const button = wrapper.get('[data-testid="saved-filter-delete-filter-1"]');
    await button.trigger("click");
    await flushPromises();

    expect(confirm).toHaveBeenCalledExactlyOnceWith("Supprimer définitivement le filtre sauvegardé « Mes contacts » ?");
    expect(remove).not.toHaveBeenCalled();
    expect(wrapper.get('[data-testid="saved-filter-apply-filter-1"]').text()).toBe("Mes contacts");
    expect(button.element).toHaveFocus();
    expect(setFilter).not.toHaveBeenCalled();
  });

  it("supprime seulement le filtre confirmé et focalise le suivant", async () => {
    vi.spyOn(globalThis, "confirm").mockReturnValue(true);
    const wrapper = await renderPanel();
    const button = wrapper.get<HTMLButtonElement>('[data-testid="saved-filter-delete-filter-1"]');
    button.element.focus();
    await button.trigger("click");
    await flushPromises();

    expect(remove).toHaveBeenCalledExactlyOnceWith({ path: { id: "filter-1" } });
    expect(wrapper.find('[data-testid="saved-filter-apply-filter-1"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="saved-filter-delete-filter-2"]').element).toHaveFocus();
    expect(setFilter).not.toHaveBeenCalled();
  });

  it("bloque un second clic pendant la suppression", async () => {
    const confirm = vi.spyOn(globalThis, "confirm").mockReturnValue(true);
    let finish = () => {};
    remove.mockImplementation(
      () =>
        new Promise<{ response: { ok: true } }>((resolve) => {
          finish = () => resolve({ response: { ok: true } });
        }),
    );
    const wrapper = await renderPanel();
    const button = wrapper.get('[data-testid="saved-filter-delete-filter-1"]');
    await button.trigger("click");
    await button.trigger("click");
    expect(remove).toHaveBeenCalledOnce();
    expect(confirm).toHaveBeenCalledOnce();
    expect(button.attributes("aria-disabled")).toBe("true");
    finish();
    await flushPromises();
  });

  it("garde le filtre après erreur et reconfirme avant chaque nouvel essai", async () => {
    const confirm = vi.spyOn(globalThis, "confirm").mockReturnValue(true);
    remove.mockResolvedValue({ response: { ok: false } });
    const wrapper = await renderPanel();
    const button = wrapper.get<HTMLButtonElement>('[data-testid="saved-filter-delete-filter-1"]');
    button.element.focus();
    await button.trigger("click");
    await flushPromises();
    expect(wrapper.find('[data-testid="saved-filter-apply-filter-1"]').exists()).toBe(true);
    expect(button.element).toHaveFocus();
    expect(button.attributes("aria-disabled")).toBeUndefined();

    confirm.mockReturnValue(false);
    await button.trigger("click");
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(remove).toHaveBeenCalledOnce();
  });

  it("respecte un déplacement volontaire du focus pendant la requête", async () => {
    vi.spyOn(globalThis, "confirm").mockReturnValue(true);
    let finish = () => {};
    remove.mockImplementation(
      () =>
        new Promise<{ response: { ok: true } }>((resolve) => {
          finish = () => resolve({ response: { ok: true } });
        }),
    );
    const wrapper = await renderPanel();
    const button = wrapper.get<HTMLButtonElement>('[data-testid="saved-filter-delete-filter-1"]');
    button.element.focus();
    await button.trigger("click");
    const save = wrapper.get<HTMLButtonElement>('[data-testid="save-filter-button"]');
    save.element.focus();
    finish();
    await flushPromises();
    expect(save.element).toHaveFocus();
  });

  it("préserve la création ordinaire d’un filtre sans confirmation de suppression", async () => {
    const confirm = vi.spyOn(globalThis, "confirm");
    const wrapper = await renderPanel();
    await wrapper.get('[data-testid="save-filter-button"]').trigger("click");
    await wrapper.get('[data-testid="save-filter-name-input"]').setValue("Nouveau");
    await wrapper.get('[data-testid="confirm-save-filter-button"]').trigger("click");
    await flushPromises();

    expect(confirm).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledExactlyOnceWith({ body: { name: "Nouveau", filters: { actorEmail: "personne@example.test" } } });
    expect(remove).not.toHaveBeenCalled();
  });

  it("annule le remplacement d’un nom existant sans POST ni perte du filtre", async () => {
    const confirm = vi.spyOn(globalThis, "confirm").mockReturnValue(false);
    const wrapper = await renderPanel();
    await wrapper.get('[data-testid="save-filter-button"]').trigger("click");
    await wrapper.get('[data-testid="save-filter-name-input"]').setValue("Mes contacts");
    const save = wrapper.get('[data-testid="confirm-save-filter-button"]');
    await save.trigger("click");
    await flushPromises();

    expect(confirm).toHaveBeenCalledExactlyOnceWith("Remplacer le filtre sauvegardé « Mes contacts » par les filtres actuels ?");
    expect(create).not.toHaveBeenCalled();
    expect(wrapper.get('[data-testid="saved-filter-apply-filter-1"]').text()).toBe("Mes contacts");
    expect(wrapper.find('[data-testid="save-filter-modal"]').exists()).toBe(true);
    expect(save.element).toHaveFocus();
  });

  it("remplace le filtre existant une seule fois après accord", async () => {
    vi.spyOn(globalThis, "confirm").mockReturnValue(true);
    create.mockResolvedValue({ data: savedFilters[0], response: { ok: true } });
    const wrapper = await renderPanel();
    await wrapper.get('[data-testid="save-filter-button"]').trigger("click");
    await wrapper.get('[data-testid="save-filter-name-input"]').setValue("Mes contacts");
    await wrapper.get('[data-testid="confirm-save-filter-button"]').trigger("click");
    await flushPromises();

    expect(create).toHaveBeenCalledExactlyOnceWith({ body: { name: "Mes contacts", filters: { actorEmail: "personne@example.test" } } });
    expect(wrapper.find('[data-testid="save-filter-modal"]').exists()).toBe(false);
    expect(wrapper.findAll('[data-testid="saved-filter-apply-filter-1"]')).toHaveLength(1);
  });

  it("annonce localement un remplacement refusé par l’API et conserve la saisie et le focus", async () => {
    const confirm = vi.spyOn(globalThis, "confirm").mockReturnValue(true);
    create.mockResolvedValue({ response: { ok: false } });
    const wrapper = await renderPanel();
    await wrapper.get('[data-testid="save-filter-button"]').trigger("click");
    const name = wrapper.get('[data-testid="save-filter-name-input"]');
    await name.setValue("Mes contacts");
    const save = wrapper.get<HTMLButtonElement>('[data-testid="confirm-save-filter-button"]');
    save.element.focus();
    await save.trigger("click");
    await flushPromises();

    const error = wrapper.get('[data-testid="save-filter-error"]');
    expect(error.text()).toBe("Erreur lors de la sauvegarde du filtre. Votre saisie est conservée.");
    expect(error.element.closest('[role="alert"]')).not.toBeNull();
    expect(name.element).toHaveValue("Mes contacts");
    expect(save.element).toHaveFocus();
    expect(wrapper.get('[data-testid="saved-filter-apply-filter-1"]').text()).toBe("Mes contacts");

    confirm.mockReturnValue(false);
    await save.trigger("click");
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenCalledOnce();
  });
});
