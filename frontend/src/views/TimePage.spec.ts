import { cleanup, fireEvent, render, screen } from "@testing-library/vue";
import { flushPromises } from "@vue/test-utils";
import { nextTick, ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import type { TechnicalDebtPoint } from "@/composables/use-application-search";
import TimePage from "./TimePage.vue";

const { search, setFilter, campaigns, addError } = vi.hoisted(() => ({
  search: vi.fn(),
  setFilter: vi.fn(),
  campaigns: vi.fn(),
  addError: vi.fn(),
}));
const filters = ref<{ millesime?: number }>({});
vi.mock("@/composables/use-application-search", () => ({
  useApplicationSearch: () => ({ searchApplications: search, setFilter, filters }),
}));
vi.mock("@/composables/use-mdit-campaigns", () => ({
  useMditCampaigns: () => ({ loadActiveCampaigns: campaigns, latestYear: ref(2026) }),
}));
vi.mock("@/stores/userStore", () => ({ useUserStore: () => ({ hasPermissions: () => false }) }));
vi.mock("@/stores/toasterStore", () => ({ useToasterStore: () => ({ addErrorMessage: addError }) }));

function renderPage(realChart = false) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { template: "<div />" } },
      { name: "application", path: "/applications/:id", component: { template: "<div />" } },
    ],
  });
  return render(TimePage, {
    global: {
      plugins: realChart ? [router] : [],
      stubs: {
        SidebarFilters: true,
        AppLoader: { template: "<span>Chargement</span>" },
        DsfrButton: { template: "<button><slot /></button>" },
        TechnicalDebtChart: realChart
          ? false
          : {
              props: ["data"],
              template: '<div data-testid="chart-data"><p v-for="point in data">{{ point.label }}</p></div>',
            },
      },
    },
  });
}

describe("TIME — données de la sélection et chargement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    campaigns.mockResolvedValue(undefined);
    search.mockResolvedValue({ technicalDebtPoints: [{ id: "app", label: "Application du millésime" }] });
    filters.value = {};
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("charge la campagne et transmet au diagramme les points de la réponse réellement reçue", async () => {
    renderPage();
    await flushPromises();
    expect(search).toHaveBeenCalledWith({ pageSize: 0, millesime: 2026 });
    expect(setFilter).toHaveBeenCalledWith({ myApplications: true });
    expect(screen.getByTestId("chart-data")).toHaveTextContent("Application du millésime");
  });

  it("remplace les scores et les applications du diagramme et du tableau en passant de 2025 à 2026 puis à 2025", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe = vi.fn();
        disconnect = vi.fn();
      },
    );
    const common = { id: "common", label: "Application commune", shortName: null };
    const points2025: TechnicalDebtPoint[] = [
      { ...common, technicalDebtInfo: { technicalMaturity: 1, businessMaturity: 5, costContainment: 1 } },
      {
        id: "historical",
        label: "Application évaluée uniquement en 2025",
        shortName: null,
        technicalDebtInfo: { technicalMaturity: 4, businessMaturity: 4, costContainment: 2 },
      },
    ];
    const points2026: TechnicalDebtPoint[] = [
      { ...common, technicalDebtInfo: { technicalMaturity: 5, businessMaturity: 1, costContainment: 5 } },
    ];
    search.mockImplementation(async ({ millesime }: { millesime: number }) => ({
      technicalDebtPoints: millesime === 2025 ? points2025 : points2026,
    }));
    filters.value = { millesime: 2025 };
    const { container } = renderPage(true);
    await flushPromises();

    function expectDisplayed(values: string[], count: number) {
      expect(container.querySelectorAll("svg a[data-application-id]")).toHaveLength(count);
      expect(container.querySelectorAll("tbody tr")).toHaveLength(count);
      const row = container.querySelector("tbody tr")!;
      expect(row.querySelector("th")).toHaveTextContent("Application commune");
      expect(Array.from(row.querySelectorAll("td"), (cell) => cell.textContent)).toEqual(values);
      const anchor = container.querySelector('svg a[data-application-id="common"]')!;
      expect(anchor).toHaveAttribute(
        "aria-label",
        expect.stringContaining(
          `Maturité technique : ${values[0]}. Maturité métier : ${values[1]}. Maîtrise des coûts MCO : ${values[2]}.`,
        ),
      );
      const circle = anchor.querySelector("circle")!;
      return { x: Number(circle.getAttribute("cx")), y: Number(circle.getAttribute("cy")), radius: Number(circle.getAttribute("r")) };
    }

    expect(search).toHaveBeenLastCalledWith({ pageSize: 0, millesime: 2025 });
    const historicalPosition = expectDisplayed(["1", "5", "1", "À migrer"], 2);

    filters.value = { millesime: 2026 };
    await nextTick();
    await vi.advanceTimersByTimeAsync(300);
    await flushPromises();
    expect(search).toHaveBeenLastCalledWith({ pageSize: 0, millesime: 2026 });
    const currentPosition = expectDisplayed(["5", "1", "5", "Tolérer"], 1);
    expect(currentPosition.x).toBeLessThan(historicalPosition.x);
    expect(currentPosition.y).toBeLessThan(historicalPosition.y);
    expect(currentPosition.radius).toBeGreaterThan(historicalPosition.radius);
    expect(container).not.toHaveTextContent("Application évaluée uniquement en 2025");

    filters.value = { millesime: 2025 };
    await nextTick();
    await vi.advanceTimersByTimeAsync(300);
    await flushPromises();
    expect(search).toHaveBeenLastCalledWith({ pageSize: 0, millesime: 2025 });
    expect(expectDisplayed(["1", "5", "1", "À migrer"], 2)).toEqual(historicalPosition);
    expect(search).toHaveBeenCalledTimes(3);
  });

  it("annonce un échec au lieu d'un portefeuille vide et permet de réessayer", async () => {
    search.mockRejectedValueOnce(new Error("Échec API"));
    renderPage();
    await flushPromises();
    expect(screen.getByRole("alert")).toHaveTextContent("Impossible de charger les données TIME");
    expect(screen.queryByTestId("chart-data")).not.toBeInTheDocument();
    await fireEvent.click(screen.getByRole("button", { name: "Réessayer le chargement TIME" }));
    await flushPromises();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByTestId("chart-data")).toHaveTextContent("Application du millésime");
  });
});
