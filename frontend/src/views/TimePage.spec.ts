import { cleanup, fireEvent, render, screen } from "@testing-library/vue";
import { flushPromises } from "@vue/test-utils";
import { ref } from "vue";
import TimePage from "./TimePage.vue";

const { search, setFilter, campaigns, addError } = vi.hoisted(() => ({
  search: vi.fn(),
  setFilter: vi.fn(),
  campaigns: vi.fn(),
  addError: vi.fn(),
}));
const filters = ref({});
vi.mock("@/composables/use-application-search", () => ({
  useApplicationSearch: () => ({ searchApplications: search, setFilter, filters }),
}));
vi.mock("@/composables/use-mdit-campaigns", () => ({
  useMditCampaigns: () => ({ loadActiveCampaigns: campaigns, latestYear: ref(2026) }),
}));
vi.mock("@/stores/userStore", () => ({ useUserStore: () => ({ hasPermissions: () => false }) }));
vi.mock("@/stores/toasterStore", () => ({ useToasterStore: () => ({ addErrorMessage: addError }) }));

function renderPage() {
  return render(TimePage, {
    global: {
      stubs: {
        SidebarFilters: true,
        AppLoader: { template: "<span>Chargement</span>" },
        DsfrButton: { template: "<button><slot /></button>" },
        TechnicalDebtChart: {
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
  afterEach(cleanup);

  it("charge la campagne et transmet au diagramme les points de la réponse réellement reçue", async () => {
    renderPage();
    await flushPromises();
    expect(search).toHaveBeenCalledWith({ pageSize: 0, millesime: 2026 });
    expect(setFilter).toHaveBeenCalledWith({ myApplications: true });
    expect(screen.getByTestId("chart-data")).toHaveTextContent("Application du millésime");
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
