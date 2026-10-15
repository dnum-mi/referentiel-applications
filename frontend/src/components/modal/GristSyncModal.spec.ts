import { flushPromises, mount } from "@vue/test-utils";
import { DsfrAlert, DsfrButtonGroup } from "@gouvminint/vue-dsfr";
import type { GristDocumentTablesDto, GristSyncReportDto } from "@/client/types.gen";
import GristSyncModal from "./GristSyncModal.vue";

const { addErrorMessage, addSuccessMessage, listGristTables, syncWithGrist } = vi.hoisted(() => ({
  addErrorMessage: vi.fn(),
  addSuccessMessage: vi.fn(),
  listGristTables: vi.fn(),
  syncWithGrist: vi.fn(),
}));

vi.mock("@/stores/toasterStore", () => ({
  useToasterStore: () => ({ addErrorMessage, addSuccessMessage }),
}));
vi.mock("@/stores/applicationStore", () => ({
  useApplicationStore: () => ({ listGristTables, syncWithGrist }),
}));
vi.mock("@/composables/use-application-search", async () => {
  const { ref } = await import("vue");
  return { useApplicationSearch: () => ({ filters: ref({ shortName: "app" }), total: ref(42) }) };
});
vi.mock("@/composables/use-column-preferences", async () => {
  const { ref } = await import("vue");
  return { useColumnPreferences: () => ({ visibleColumns: ref([{ field: "label" }, { field: "status" }]) }) };
});
const COLUMNS = ["label", "status"];

const mounted: Array<{ unmount: () => void }> = [];

async function renderModal() {
  const wrapper = mount(GristSyncModal, {
    attachTo: document.body,
    props: { opened: true },
    global: {
      components: { DsfrAlert, DsfrButtonGroup },
      stubs: {
        teleport: true,
        DsfrModal: { template: '<div><slot /><slot name="footer" /></div>' },
        DsfrButton: { props: ["label", "disabled"], template: '<button :disabled="disabled">{{ label }}</button>' },
        DsfrSelect: {
          props: ["modelValue", "options", "label", "disabled", "errorMessage"],
          emits: ["update:modelValue"],
          template: `<label>{{ label }}<select :value="modelValue" :disabled="disabled" @change="$emit('update:modelValue', $event.target.value)">
            <option v-for="o in options" :key="o.value" :value="o.value">{{ o.text }}</option>
          </select><span>{{ errorMessage }}</span></label>`,
        },
      },
    },
  });
  mounted.push(wrapper);
  await flushPromises();
  return wrapper;
}

const confirm = (wrapper: Awaited<ReturnType<typeof renderModal>>) =>
  wrapper.get('[data-testid="grist-sync-confirm-btn"]').trigger("click");

const ok = (docId: string, tableId: string, rowsKept = 0, rowsDeleted = 0, columnsAdded: string[] = [], columnsRemoved: string[] = []) => ({
  docId,
  tableId,
  status: "ok",
  tableCreated: false,
  rowsWritten: 42,
  rowsKept,
  rowsDeleted,
  columnsAdded,
  columnsRemoved,
});

beforeEach(() => {
  vi.clearAllMocks();
  listGristTables.mockResolvedValue([
    { docId: "doc1", tables: ["RefApp", "RefApp2"] },
    { docId: "doc2", tables: [] },
  ]);
  syncWithGrist.mockResolvedValue({ documents: [] });
});
afterEach(() => {
  mounted.forEach((wrapper) => wrapper.unmount());
  mounted.length = 0;
  vi.restoreAllMocks();
});

describe("GristSyncModal", () => {
  it("propose pour chaque document ses tables RefApp ou une nouvelle table", async () => {
    const wrapper = await renderModal();

    const options = (docId: string) => wrapper.findAll(`[data-testid="grist-sync-choice-${docId}"] option`).map((option) => option.text());
    expect(options("doc1")).toEqual(["RefApp (mise à jour)", "RefApp2 (mise à jour)", "Nouvelle table"]);
    expect(options("doc2")).toEqual(["Nouvelle table"]);
  });

  it("synchronise par défaut la première table, ou une nouvelle table sans table existante, avec les colonnes affichées", async () => {
    const wrapper = await renderModal();
    await confirm(wrapper);

    expect(syncWithGrist).toHaveBeenCalledExactlyOnceWith(
      { shortName: "app" },
      [
        { docId: "doc1", tableId: "RefApp" },
        { docId: "doc2", newTable: true },
      ],
      COLUMNS,
    );
  });

  it("envoie les tables choisies", async () => {
    const wrapper = await renderModal();
    await wrapper.get('[data-testid="grist-sync-choice-doc1"] select').setValue("RefApp2");
    await confirm(wrapper);

    expect(syncWithGrist).toHaveBeenCalledWith(
      { shortName: "app" },
      [
        { docId: "doc1", tableId: "RefApp2" },
        { docId: "doc2", newTable: true },
      ],
      COLUMNS,
    );
  });

  it("ne synchronise rien si aucun document n'est lisible", async () => {
    listGristTables.mockResolvedValue([{ docId: "doc1", tables: [], error: "Grist a refusé la requête (404)." }]);
    const wrapper = await renderModal();
    await confirm(wrapper);

    expect(syncWithGrist).not.toHaveBeenCalled();
    expect(wrapper.get('[data-testid="grist-sync-error"]').text()).toContain("Aucun document lisible à synchroniser.");
  });

  it("écarte un document illisible et affiche son erreur", async () => {
    listGristTables.mockResolvedValue([
      { docId: "doc1", tables: ["RefApp"] },
      { docId: "doc2", tables: [], error: "Grist a refusé la requête (404)." },
    ]);
    const wrapper = await renderModal();

    const doc2 = wrapper.get('[data-testid="grist-sync-choice-doc2"]');
    expect(doc2.get("select").attributes("disabled")).toBeDefined();
    expect(doc2.text()).toContain("Document illisible : Grist a refusé la requête (404).");
    await confirm(wrapper);
    expect(syncWithGrist).toHaveBeenCalledWith({ shortName: "app" }, [{ docId: "doc1", tableId: "RefApp" }], COLUMNS);
  });

  it("annonce les tables synchronisées et celles en échec, puis se ferme", async () => {
    syncWithGrist.mockResolvedValue({
      documents: [
        ok("doc1", "RefApp", 3, 5, ["statut"], ["iq", "tags"]),
        { docId: "doc2", tableId: "RefApp2", status: "error", error: "Grist a refusé la requête (404)." },
      ],
    });
    const wrapper = await renderModal();
    await confirm(wrapper);
    await flushPromises();

    expect(addSuccessMessage).toHaveBeenCalledWith(
      "Grist synchronisé (doc1 › RefApp) : 42 applications, 3 conservées hors sélection, 5 retirées. Colonnes ajoutées : statut. Colonnes retirées : iq, tags.",
    );
    expect(addErrorMessage).toHaveBeenCalledWith("Synchronisation Grist en échec pour doc2 › RefApp2 (Grist a refusé la requête (404).).");
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("reste ouverte avec un message si la synchronisation échoue", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    syncWithGrist.mockRejectedValue(new Error("502"));
    const wrapper = await renderModal();
    await confirm(wrapper);
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toContain("Une erreur est survenue lors de la synchronisation avec Grist.");
    expect(wrapper.emitted("close")).toBeUndefined();
    expect(addSuccessMessage).not.toHaveBeenCalled();
  });

  it("signale des documents illisibles quand la liste ne peut pas être lue", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    listGristTables.mockRejectedValue(new Error("400"));
    const wrapper = await renderModal();

    expect(wrapper.get('[role="alert"]').text()).toContain("Impossible de lire vos documents Grist.");
    expect(wrapper.findAll('[data-testid="grist-sync-document"]')).toHaveLength(0);
  });

  it("conserve une région de statut pendant la lecture et bloque l'envoi prématuré", async () => {
    const pending = Promise.withResolvers<GristDocumentTablesDto[]>();
    listGristTables.mockReturnValueOnce(pending.promise);
    const wrapper = await renderModal();
    const status = wrapper.get("output");
    expect(status.attributes("aria-live")).toBe("polite");
    expect(status.attributes("aria-atomic")).toBe("true");
    expect(status.text()).toBe("Lecture de vos documents Grist…");
    expect(wrapper.get('[data-testid="grist-sync-confirm-btn"]').attributes("aria-disabled")).toBe("true");
    await confirm(wrapper);
    expect(syncWithGrist).not.toHaveBeenCalled();
    pending.resolve([{ docId: "doc1", tables: ["RefApp"] }]);
    await flushPromises();
    expect(wrapper.get("output").element).toBe(status.element);
    expect(status.text()).toBe("");
    expect(wrapper.get('[data-testid="grist-sync-choice-doc1"] select').element).toHaveAccessibleName("Document doc1");
  });

  it("garde le bouton focalisable et l'erreur dans la modale après une synchronisation différée", async () => {
    const pending = Promise.withResolvers<GristSyncReportDto>();
    syncWithGrist.mockReturnValueOnce(pending.promise);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapper = await renderModal();
    const button = wrapper.get<HTMLButtonElement>('[data-testid="grist-sync-confirm-btn"]');
    button.element.focus();
    await confirm(wrapper);
    expect(button.attributes("aria-disabled")).toBe("true");
    expect(button.attributes("disabled")).toBeUndefined();
    expect(button.element).toHaveFocus();
    expect(wrapper.get("output").text()).toBe("Synchronisation avec Grist en cours…");
    await confirm(wrapper);
    expect(syncWithGrist).toHaveBeenCalledOnce();
    pending.reject(new Error("500 simulé"));
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toContain("Une erreur est survenue lors de la synchronisation avec Grist.");
    expect(button.attributes("aria-disabled")).toBe("false");
    expect(button.element).toHaveFocus();
    expect(wrapper.emitted("close")).toBeUndefined();
    expect(wrapper.get('[data-testid="grist-sync-choice-doc1"] select').element).toHaveValue("RefApp");
  });

  it("respecte un déplacement volontaire de focus pendant l'attente", async () => {
    const pending = Promise.withResolvers<GristSyncReportDto>();
    syncWithGrist.mockReturnValueOnce(pending.promise);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapper = await renderModal();
    const button = wrapper.get<HTMLButtonElement>('[data-testid="grist-sync-confirm-btn"]');
    button.element.focus();
    await confirm(wrapper);
    const cancel = wrapper.get<HTMLButtonElement>('[data-testid="grist-sync-cancel-btn"]');
    cancel.element.focus();
    pending.reject(new Error("500 simulé"));
    await flushPromises();
    expect(cancel.element).toHaveFocus();
  });

  it("rend les actions dans les éléments de liste du vrai groupe DSFR", async () => {
    const wrapper = await renderModal();
    const list = wrapper.get("ul.fr-btns-group");
    expect(list.element.children).toHaveLength(2);
    expect(Array.from(list.element.children).every((child) => child.tagName === "LI")).toBe(true);
    expect(list.get('[data-testid="grist-sync-confirm-btn"]').element).toHaveAccessibleName("Synchroniser");
  });
});
