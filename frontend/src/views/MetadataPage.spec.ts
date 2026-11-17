import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import MetadataPage from "./MetadataPage.vue";

const { fetchMetadatas, state } = vi.hoisted(() => ({
  fetchMetadatas: vi.fn(),
  state: {
    metadatas: [
      {
        id: "metadata-1",
        applicationId: null,
        createdAt: "2026-10-13T10:00:00.000Z",
        action: "update",
        description: "Modification fictive",
        createdBy: { email: "fictif@example.invalid", organization: null },
        impersonator: null,
      },
    ],
    total: 1,
  },
}));
vi.mock("@/router", () => ({ setPageTitle: vi.fn() }));
vi.mock("@/stores/metadataStore", () => ({
  useMetadataStore: () => ({
    get metadatas() {
      return state.metadatas;
    },
    get total() {
      return state.total;
    },
    fetchMetadatasGlobal: fetchMetadatas,
  }),
}));
enableAutoUnmount(afterEach);
beforeEach(() => {
  state.metadatas = [
    {
      id: "metadata-1",
      applicationId: null,
      createdAt: "2026-10-13T10:00:00.000Z",
      action: "update",
      description: "Modification fictive",
      createdBy: { email: "fictif@example.invalid", organization: null },
      impersonator: null,
    },
  ];
  state.total = 1;
  fetchMetadatas.mockReset();
  fetchMetadatas.mockResolvedValue(undefined);
});

async function renderPage() {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/historique", component: { template: "<div />" } }] });
  await router.push("/historique");
  const wrapper = mount(MetadataPage, {
    attachTo: document.body,
    global: {
      plugins: [router],
      stubs: {
        RefAppTable: { template: "<table><caption>Modifications</caption></table>" },
        PaginationFooter: { name: "PaginationFooter", template: "<div />", emits: ["update:page", "update:limit"] },
      },
    },
  });
  await flushPromises();
  return wrapper;
}

it("garde le focus et les filtres après un refus différé et bloque les actions concurrentes", async () => {
  const wrapper = await renderPage();
  let reject!: (reason: Error) => void;
  fetchMetadatas.mockReturnValueOnce(new Promise((_resolve, refuse) => (reject = refuse)));
  const from = wrapper.get('[data-testid="history-filter-date-from"]');
  await from.setValue("2026-10-13T11:00");
  const apply = wrapper.get<HTMLButtonElement>('[data-testid="history-apply-filters"]');
  apply.element.focus();
  await wrapper.get("form").trigger("submit");
  expect(apply.element).not.toBeDisabled();
  expect(apply.element).toHaveAttribute("aria-disabled", "true");
  expect(apply.element).toHaveFocus();
  await wrapper.get("form").trigger("submit");
  await wrapper.get('[data-testid="history-clear-filters"]').trigger("click");
  expect(fetchMetadatas).toHaveBeenCalledTimes(2);
  expect(from.element).toHaveValue("2026-10-13T11:00");
  state.metadatas = [];
  state.total = 0;
  reject(new Error("API refusée"));
  await flushPromises();
  expect(apply.element).toHaveFocus();
  expect(wrapper.find('[data-testid="history-empty"]').exists()).toBe(true);
  expect(from.element).toHaveValue("2026-10-13T11:00");
});

it("respecte le focus déplacé volontairement pendant le chargement", async () => {
  const wrapper = await renderPage();
  let resolve!: () => void;
  fetchMetadatas.mockReturnValueOnce(new Promise<void>((release) => (resolve = release)));
  wrapper.get<HTMLButtonElement>('[data-testid="history-apply-filters"]').element.focus();
  await wrapper.get("form").trigger("submit");
  const to = wrapper.get<HTMLInputElement>('[data-testid="history-filter-date-to"]').element;
  to.focus();
  resolve();
  await flushPromises();
  expect(to).toHaveFocus();
});

it("annonce les résultats et rejoint le tableau après un filtrage réussi sans déplacement volontaire", async () => {
  const wrapper = await renderPage();
  wrapper.get<HTMLButtonElement>('[data-testid="history-apply-filters"]').element.focus();
  await wrapper.get("form").trigger("submit");
  await flushPromises();
  expect(wrapper.get('[data-testid="history-results-status"]').text()).toBe("1 résultat(s)");
  expect(wrapper.get('[data-testid="history-table-region"]').element).toHaveFocus();
});

it("annonce zéro résultat et rejoint la région contenant l'état vide", async () => {
  const wrapper = await renderPage();
  const region = wrapper.get('[data-testid="history-table-region"]').element;
  state.metadatas = [];
  state.total = 0;
  wrapper.get<HTMLButtonElement>('[data-testid="history-apply-filters"]').element.focus();
  await wrapper.get("form").trigger("submit");
  await flushPromises();
  expect(wrapper.get('[data-testid="history-table-region"]').element).toBe(region);
  expect(region).toHaveFocus();
  expect(region).toHaveTextContent("Aucune donnée recensée.");
  expect(wrapper.get('[data-testid="history-results-status"]').element).toHaveAttribute("aria-live", "polite");
  expect(wrapper.get('[data-testid="history-results-status"]').element).toHaveAttribute("aria-atomic", "true");
  expect(wrapper.get('[data-testid="history-results-status"]').text()).toBe("0 résultat(s)");
});

it("respecte aussi le focus déplacé pendant une recherche sans résultat", async () => {
  const wrapper = await renderPage();
  let resolve!: () => void;
  fetchMetadatas.mockReturnValueOnce(new Promise<void>((release) => (resolve = release)));
  wrapper.get<HTMLButtonElement>('[data-testid="history-apply-filters"]').element.focus();
  await wrapper.get("form").trigger("submit");
  const to = wrapper.get<HTMLInputElement>('[data-testid="history-filter-date-to"]').element;
  to.focus();
  state.metadatas = [];
  state.total = 0;
  resolve();
  await flushPromises();
  expect(to).toHaveFocus();
  expect(wrapper.get('[data-testid="history-results-status"]').text()).toBe("0 résultat(s)");
});

it.each([
  ["from", "début"],
  ["to", "fin"],
])("signale une date de %s partielle même si sa valeur native est vide", async (field, label) => {
  const wrapper = await renderPage();
  expect(wrapper.get("form").element).toHaveAttribute("novalidate");
  const input = wrapper.get<HTMLInputElement>(`[data-testid="history-filter-date-${field}"]`);
  // jsdom ne sait pas saisir les segments natifs d'une date : simuler leur validité.
  vi.spyOn(input.element, "validity", "get").mockReturnValue({ valid: false, badInput: true } as ValidityState);
  expect(input.element.value).toBe("");
  await wrapper.get("form").trigger("submit");
  await flushPromises();
  expect(fetchMetadatas).toHaveBeenCalledTimes(1);
  expect(input.element).toHaveFocus();
  expect(input.element).toHaveAttribute("aria-invalid", "true");
  expect(input.element).toHaveAccessibleDescription(
    `Date de ${label} – veuillez saisir une date et une heure valides, exemple : 23/05/2026 14:30`,
  );
  expect(wrapper.get('[data-testid="history-results-status"]').text()).toBe("");
});

it("accepte les dates facultatives vides et transmet les dates valides", async () => {
  const wrapper = await renderPage();
  await wrapper.get("form").trigger("submit");
  await flushPromises();
  expect(fetchMetadatas).toHaveBeenLastCalledWith(expect.objectContaining({ createdAtGte: undefined, createdAtLte: undefined }));
  const from = "2026-11-17T09:30";
  const to = "2026-11-17T10:30";
  await wrapper.get('[data-testid="history-filter-date-from"]').setValue(from);
  await wrapper.get('[data-testid="history-filter-date-to"]').setValue(to);
  await wrapper.get("form").trigger("submit");
  await flushPromises();
  expect(fetchMetadatas).toHaveBeenLastCalledWith(
    expect.objectContaining({ createdAtGte: new Date(from).toISOString(), createdAtLte: new Date(to).toISOString() }),
  );
});

it("efface les dates et leurs erreurs avant de relancer la recherche", async () => {
  const wrapper = await renderPage();
  const from = wrapper.get<HTMLInputElement>('[data-testid="history-filter-date-from"]');
  const validity = vi.spyOn(from.element, "validity", "get").mockReturnValue({ valid: false, badInput: true } as ValidityState);
  await wrapper.get("form").trigger("submit");
  await flushPromises();
  validity.mockRestore();
  await wrapper.get('[data-testid="history-clear-filters"]').trigger("click");
  await flushPromises();
  expect(fetchMetadatas).toHaveBeenCalledTimes(2);
  expect(from.element).toHaveValue("");
  expect(from.element).not.toHaveAttribute("aria-invalid", "true");
  expect(fetchMetadatas).toHaveBeenLastCalledWith(expect.objectContaining({ createdAtGte: undefined, createdAtLte: undefined }));
});

it("réannonce le même nombre de résultats après une nouvelle recherche", async () => {
  const wrapper = await renderPage();
  await wrapper.get("form").trigger("submit");
  await flushPromises();
  expect(wrapper.get('[data-testid="history-results-status"]').text()).toBe("1 résultat(s)");
  let resolve!: () => void;
  fetchMetadatas.mockReturnValueOnce(new Promise<void>((release) => (resolve = release)));
  await wrapper.get("form").trigger("submit");
  expect(wrapper.get('[data-testid="history-results-status"]').text()).toBe("");
  resolve();
  await flushPromises();
  expect(wrapper.get('[data-testid="history-results-status"]').text()).toBe("1 résultat(s)");
});

it("recherche une seule fois en revenant à la première page après filtrage", async () => {
  const wrapper = await renderPage();
  wrapper.getComponent({ name: "PaginationFooter" }).vm.$emit("update:page", 1);
  await flushPromises();
  expect(fetchMetadatas).toHaveBeenCalledTimes(2);
  expect(fetchMetadatas).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }));
  await wrapper.get("form").trigger("submit");
  await flushPromises();
  expect(fetchMetadatas).toHaveBeenCalledTimes(3);
  expect(fetchMetadatas).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0 }));
});
