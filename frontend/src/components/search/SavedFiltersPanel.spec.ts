import { createPinia } from "pinia";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import type { SavedFilterDto } from "@/client/types.gen";
import { useSavedFilterStore } from "@/stores/savedFilterStore";
import SavedFiltersPanel from "./SavedFiltersPanel.vue";

const { findAll, remove, create, rename, setFilter, currentFilters } = vi.hoisted(() => ({
  findAll: vi.fn(),
  remove: vi.fn(),
  create: vi.fn(),
  rename: vi.fn(),
  setFilter: vi.fn(),
  currentFilters: { value: { actorEmail: "personne@example.test" } as Record<string, unknown> },
}));

vi.mock("@/api/index", () => ({
  default: {
    savedFilterControllerFindAll: findAll,
    savedFilterControllerRemove: remove,
    savedFilterControllerCreate: create,
    savedFilterControllerRename: rename,
  },
}));
vi.mock("@/composables/use-application-search", () => ({
  DEFAULT_FILTERS: {},
  useApplicationSearch: () => ({ filters: currentFilters, setFilter }),
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
        DsfrModal: {
          props: { opened: Boolean, title: String },
          template: '<section v-if="opened" role="dialog" :aria-label="title"><slot /><slot name="footer" /></section>',
        },
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
  rename.mockReset().mockResolvedValue({ data: { ...savedFilters[0], name: "Renommé" }, response: { ok: true } });
  setFilter.mockReset();
  currentFilters.value = { actorEmail: "personne@example.test" };
});

describe("SavedFiltersPanel — renommage indépendant des critères (#3095)", () => {
  it("renomme A sans remplacer ses critères ni appliquer la recherche courante B", async () => {
    currentFilters.value = { search: "B", tag: ["autre"] };
    const before = structuredClone(savedFilters[0]);
    const wrapper = await renderPanel();
    const trigger = wrapper.get<HTMLButtonElement>('[data-testid="saved-filter-rename-filter-1"]');
    trigger.element.focus();
    await trigger.trigger("click");
    const dialog = wrapper.get('[data-testid="rename-filter-modal"]');
    expect(dialog.attributes("aria-label")).toBe("Renommer le filtre personnel");
    await wrapper.get('[data-testid="rename-filter-name-input"]').setValue(" Renommé ");
    await wrapper.get('[data-testid="confirm-rename-filter-button"]').trigger("click");
    await flushPromises();

    expect(rename).toHaveBeenCalledExactlyOnceWith({ path: { id: "filter-1" }, body: { name: "Renommé" } });
    expect(create).not.toHaveBeenCalled();
    expect(setFilter).not.toHaveBeenCalled();
    expect(currentFilters.value).toEqual({ search: "B", tag: ["autre"] });
    expect(savedFilters[0]).toEqual(before);
    expect(useSavedFilterStore().savedFilters[0]).toEqual({ ...before, name: "Renommé" });
    expect(wrapper.get('[data-testid="saved-filter-apply-filter-1"]').text()).toBe("Renommé");
    expect(wrapper.find('[data-testid="rename-filter-modal"]').exists()).toBe(false);
    expect(trigger.element).toHaveFocus();
  });

  it("conserve la saisie et le nom existant après conflit puis permet un nouvel essai", async () => {
    rename.mockResolvedValueOnce({
      response: { ok: false, status: 409 },
      error: { message: "Un autre filtre personnel porte déjà ce nom." },
    });
    const wrapper = await renderPanel();
    await wrapper.get('[data-testid="saved-filter-rename-filter-1"]').trigger("click");
    const input = wrapper.get('[data-testid="rename-filter-name-input"]');
    await input.setValue("Renommé");
    const submit = wrapper.get<HTMLButtonElement>('[data-testid="confirm-rename-filter-button"]');
    submit.element.focus();
    await submit.trigger("click");
    await flushPromises();

    expect(input.element).toHaveValue("Renommé");
    expect(wrapper.get('[data-testid="saved-filter-apply-filter-1"]').text()).toBe("Mes contacts");
    const error = wrapper.get('[data-testid="rename-filter-error"]');
    expect(error.text()).toContain("Un autre filtre personnel porte déjà ce nom.");
    expect(error.element.closest('[role="alert"]')).not.toBeNull();
    expect(submit.element).toHaveFocus();
    await submit.trigger("click");
    await flushPromises();
    expect(rename).toHaveBeenCalledTimes(2);
    expect(wrapper.find('[data-testid="rename-filter-modal"]').exists()).toBe(false);
  });

  it("garde la saisie après erreur réseau sans mettre à jour le filtre", async () => {
    rename.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const wrapper = await renderPanel();
    await wrapper.get('[data-testid="saved-filter-rename-filter-1"]').trigger("click");
    await wrapper.get('[data-testid="rename-filter-name-input"]').setValue("Renommé");
    await wrapper.get('[data-testid="confirm-rename-filter-button"]').trigger("click");
    await flushPromises();
    expect(wrapper.get('[data-testid="rename-filter-name-input"]').element).toHaveValue("Renommé");
    expect(wrapper.get('[data-testid="saved-filter-apply-filter-1"]').text()).toBe("Mes contacts");
    expect(wrapper.get('[data-testid="rename-filter-error"]').text()).toContain("Votre saisie est conservée");
  });

  it("bloque les soumissions répétées pendant le renommage", async () => {
    let finish = () => {};
    rename.mockImplementationOnce(
      () =>
        new Promise<{ data: SavedFilterDto; response: { ok: true } }>((resolve) => {
          finish = () => resolve({ data: { ...savedFilters[0], name: "Renommé" }, response: { ok: true } });
        }),
    );
    const wrapper = await renderPanel();
    await wrapper.get('[data-testid="saved-filter-rename-filter-1"]').trigger("click");
    const input = wrapper.get('[data-testid="rename-filter-name-input"]');
    await input.setValue("Renommé");
    await input.trigger("keyup", { key: "Enter" });
    await input.trigger("keyup", { key: "Enter" });
    expect(rename).toHaveBeenCalledTimes(1);
    expect(wrapper.get('[data-testid="confirm-rename-filter-button"]').attributes("disabled")).toBeDefined();
    finish();
    await flushPromises();
    expect(wrapper.find('[data-testid="rename-filter-modal"]').exists()).toBe(false);
  });

  it("ne ferme pas un nouveau dialogue quand une ancienne requête se termine", async () => {
    let finish = () => {};
    rename.mockImplementationOnce(
      () =>
        new Promise<{ data: SavedFilterDto; response: { ok: true } }>((resolve) => {
          finish = () => resolve({ data: { ...savedFilters[0], name: "Renommé" }, response: { ok: true } });
        }),
    );
    const wrapper = await renderPanel();
    await wrapper.get('[data-testid="saved-filter-rename-filter-1"]').trigger("click");
    await wrapper.get('[data-testid="rename-filter-name-input"]').setValue("Renommé");
    await wrapper.get('[data-testid="confirm-rename-filter-button"]').trigger("click");
    const cancel = wrapper
      .get('[data-testid="rename-filter-modal"]')
      .findAll("button")
      .find((button) => button.text() === "Annuler");
    await cancel!.trigger("click");
    await wrapper.get('[data-testid="saved-filter-rename-filter-2"]').trigger("click");
    finish();
    await flushPromises();
    expect(wrapper.get('[data-testid="rename-filter-name-input"]').element).toHaveValue("Mes abonnements");
    expect(wrapper.find('[data-testid="rename-filter-modal"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="saved-filter-apply-filter-1"]').text()).toBe("Renommé");
    expect(wrapper.get('[data-testid="saved-filter-apply-filter-2"]').text()).toBe("Mes abonnements");
  });

  it("annule sans appel et rend le focus au bouton du filtre", async () => {
    const wrapper = await renderPanel();
    const trigger = wrapper.get<HTMLButtonElement>('[data-testid="saved-filter-rename-filter-1"]');
    trigger.element.focus();
    await trigger.trigger("click");
    const input = wrapper.get<HTMLInputElement>('[data-testid="rename-filter-name-input"]');
    input.element.focus();
    const cancel = wrapper
      .get('[data-testid="rename-filter-modal"]')
      .findAll("button")
      .find((button) => button.text() === "Annuler");
    await cancel!.trigger("click");
    await flushPromises();
    expect(rename).not.toHaveBeenCalled();
    expect(trigger.element).toHaveFocus();
  });

  it("ne soumet pas de nom vide et accepte de conserver son propre nom", async () => {
    const wrapper = await renderPanel();
    await wrapper.get('[data-testid="saved-filter-rename-filter-1"]').trigger("click");
    const input = wrapper.get('[data-testid="rename-filter-name-input"]');
    await input.setValue("   ");
    await input.trigger("keyup", { key: "Enter" });
    expect(rename).not.toHaveBeenCalled();
    await input.setValue("Mes contacts");
    await wrapper.get('[data-testid="confirm-rename-filter-button"]').trigger("click");
    await flushPromises();
    expect(rename).toHaveBeenCalledExactlyOnceWith({ path: { id: "filter-1" }, body: { name: "Mes contacts" } });
  });
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
