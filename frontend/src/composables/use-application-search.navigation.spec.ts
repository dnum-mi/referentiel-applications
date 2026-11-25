import { cleanup, fireEvent, render, screen } from "@testing-library/vue";
import { flushPromises } from "@vue/test-utils";
import { defineComponent, nextTick, watch } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import type { TechnicalDebtPoint } from "./use-application-search";

const { search, campaigns } = vi.hoisted(() => ({ search: vi.fn(), campaigns: vi.fn() }));

vi.mock("@/api/index.js", () => ({ default: { applicationControllerSearch: search } }));
vi.mock("@/stores/statisticsStore", () => ({
  useStatisticsStore: () => ({ countApplications: vi.fn().mockResolvedValue(0), countTechnicalDebtPoints: vi.fn() }),
}));
vi.mock("@/stores/userStore", () => ({
  useUserStore: () => ({ hasApplicationAccess: true, hasPermissions: () => true }),
}));
vi.mock("@/stores/toasterStore", () => ({ useToasterStore: () => ({ addErrorMessage: vi.fn() }) }));
vi.mock("@/composables/use-mdit-campaigns", async () => {
  const { ref } = await import("vue");
  return { useMditCampaigns: () => ({ loadActiveCampaigns: campaigns, latestYear: ref(2026) }) };
});

function technicalDebtPoint(millesime: number): TechnicalDebtPoint {
  return {
    id: "application",
    label: `Application évaluée en ${millesime}`,
    shortName: null,
    technicalDebtInfo: { technicalMaturity: 3, businessMaturity: 4, costContainment: 2 },
  };
}

async function createTestRouter(url = "/time") {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/time", component: { template: "<div />" } },
      { name: "application", path: "/applications/:id", component: { template: "<div />" } },
    ],
  });
  await router.push(url);
  await router.isReady();
  return router;
}

describe("useApplicationSearch — navigation et focus TIME", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    vi.clearAllMocks();
    campaigns.mockResolvedValue(undefined);
    search.mockImplementation(async ({ query }: { query: { millesime?: number } }) => ({
      response: { ok: true },
      data: {
        results: [],
        total: 1,
        technicalDebtPoints: [technicalDebtPoint(query.millesime ?? 2026)],
        averageIq: 0,
      },
    }));
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe = vi.fn();
        disconnect = vi.fn();
      },
    );
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("conserve le tableau, son ouverture et son focus après navigation vers son ancre, puis recharge un vrai changement de filtre", async () => {
    const router = await createTestRouter();
    const { default: TimePage } = await import("@/views/TimePage.vue");
    const { container } = render(TimePage, {
      global: {
        plugins: [router],
        stubs: {
          SidebarFilters: true,
          AppLoader: { template: "<span>Chargement</span>" },
          DsfrButton: { template: "<button><slot /></button>" },
        },
      },
    });
    await flushPromises();
    expect(search).toHaveBeenCalledTimes(1);
    const table = container.querySelector("table")!;
    const transcription = screen.getByTestId("technical-debt-transcription");
    const link = screen.getByRole("link", { name: "Consulter le tableau complet du diagramme TIME" });
    await fireEvent.click(link);
    table.focus();
    await router.push({ hash: link.getAttribute("href")! });
    await nextTick();
    await vi.advanceTimersByTimeAsync(350);
    await flushPromises();

    expect(search).toHaveBeenCalledTimes(1);
    expect(container.querySelector("table")).toBe(table);
    expect(transcription).toHaveAttribute("open");
    expect(table).toHaveFocus();
    expect(router.currentRoute.value.hash).toBe(`#${table.id}`);

    await router.push({ query: { millesime: "2025" } });
    await nextTick();
    await vi.advanceTimersByTimeAsync(300);
    await flushPromises();

    expect(search).toHaveBeenCalledTimes(2);
    expect(search).toHaveBeenLastCalledWith(expect.objectContaining({ query: expect.objectContaining({ millesime: 2025 }) }));
    expect(container.querySelector("tbody")).toHaveTextContent("Application évaluée en 2025");
    expect(container.querySelector("tbody")).not.toHaveTextContent("Application évaluée en 2026");
  });

  it("ignore les encodages équivalents et les paramètres étrangers tout en conservant les vraies navigations de pagination", async () => {
    const router = await createTestRouter("/time?tag=second,premier&page=2");
    const { useApplicationSearch } = await import("./use-application-search");
    let applicationSearch: ReturnType<typeof useApplicationSearch> | undefined;
    const changed = vi.fn();
    const Probe = defineComponent({
      setup() {
        applicationSearch = useApplicationSearch();
        watch(applicationSearch.filters, changed, { deep: true });
        return () => null;
      },
    });
    render(Probe, { global: { plugins: [router] } });
    const initialFilters = applicationSearch!.filters.value;

    await router.push({ query: { tag: ["premier", "second"], page: "02", ignored: "true" }, hash: "#table" });
    await nextTick();
    expect(applicationSearch!.filters.value).toBe(initialFilters);
    expect(applicationSearch!.filters.value.page).toBe(2);
    expect(changed).not.toHaveBeenCalled();

    await router.push({ query: { tag: "premier,second", page: "3" } });
    await nextTick();
    expect(applicationSearch!.filters.value.page).toBe(3);
    expect(applicationSearch!.filters.value.tag).toEqual(["premier", "second"]);
    expect(changed).toHaveBeenCalledTimes(1);
  });
});
