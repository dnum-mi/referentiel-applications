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
      stubs: { RefAppTable: { template: "<table><caption>Modifications</caption></table>" }, PaginationFooter: true },
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
