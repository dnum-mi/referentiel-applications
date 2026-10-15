import { cleanup, fireEvent, render, screen } from "@testing-library/vue";
import { reactive, ref } from "vue";
import TechnologyFilter from "./TechnologyFilter.vue";
import SidebarFilter from "./SidebarFilter.vue";

const filters = ref({ technologyEolStatus: "eol" as string | undefined });
const setFilter = vi.fn();
const userStore = reactive({ canListTechnologies: true, user: null });

vi.mock("@/composables/use-application-search", () => ({
  useApplicationSearch: () => ({ filters, setFilter, total: ref(0), resetFilters: vi.fn() }),
}));
vi.mock("@/stores/userStore", () => ({ useUserStore: () => userStore }));
vi.mock("@/stores/statisticsStore", () => ({ useStatisticsStore: () => ({ totalApplications: 0, technicalDebtPointTotal: 0 }) }));
vi.mock("@/composables/use-mdit-campaigns", () => ({ useMditCampaigns: () => ({ latestYear: ref(2026) }) }));
vi.mock("vue-router", () => ({ useRoute: () => ({ path: "/recherche-application" }) }));

beforeEach(() => {
  filters.value.technologyEolStatus = "eol";
  userStore.canListTechnologies = true;
  setFilter.mockReset();
});
afterEach(cleanup);

describe("TechnologyFilter", () => {
  it("présente les statuts existants et sélectionne celui de la recherche", () => {
    render(TechnologyFilter);
    expect(screen.getByTestId("technology-filter-eol-status")).toHaveValue("eol");
    expect(screen.getByRole("option", { name: "Fin de vie" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Fin de vie proche" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Fin de support actif" })).toBeInTheDocument();
  });

  it.each([
    ["eol-soon", "eol-soon"],
    ["", undefined],
  ])("applique %s et revient à la première page", async (selection, expected) => {
    render(TechnologyFilter);
    await fireEvent.update(screen.getByTestId("technology-filter-eol-status"), selection);
    expect(setFilter).toHaveBeenCalledExactlyOnceWith({ technologyEolStatus: expected, page: 0 });
  });

  it.each([true, false])("affiche l'accordéon seulement avec TechnologyList : %s", (allowed) => {
    userStore.canListTechnologies = allowed;
    render(SidebarFilter, {
      global: {
        stubs: {
          DsfrAccordion: { template: "<section><slot /></section>" },
          BusinessDivisionSearch: true,
          CampaignFilter: true,
          ApplicationFilter: true,
          PriorityRestartFilter: true,
          StatusFilter: true,
          ActorFilter: true,
          HostingFilter: true,
          ComplianceFilter: true,
          RelationFilter: true,
          DataFilter: true,
          QualityFilter: true,
          SavedFiltersPanel: true,
        },
      },
    });
    expect(screen.queryByTestId("sidebar-accordion-technologies") !== null).toBe(allowed);
    expect(screen.queryByTestId("technology-filter-eol-status") !== null).toBe(allowed);
  });
});
