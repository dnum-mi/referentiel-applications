import { cleanup, fireEvent, render, screen } from "@testing-library/vue";
import { ref } from "vue";
import type { SavedFilterDto } from "@/client/types.gen";
import { DEFAULT_FILTERS, type Filters } from "@/composables/use-application-search";
import SavedFiltersPanel from "./SavedFiltersPanel.vue";

const { setFilter, savedFilterStore } = vi.hoisted(() => ({
  setFilter: vi.fn(),
  savedFilterStore: {
    savedFilters: [] as SavedFilterDto[],
    fetchSavedFilters: vi.fn(),
    saveFilter: vi.fn(),
    deleteFilter: vi.fn(),
  },
}));

const filters = ref<Filters>({});

vi.mock("@/api/index.js", () => ({ default: {} }));
vi.mock("@/stores/statisticsStore", () => ({ useStatisticsStore: vi.fn() }));
vi.mock("@/composables/use-application-search", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/composables/use-application-search")>()),
  useApplicationSearch: () => ({ filters, setFilter }),
}));
vi.mock("@/stores/savedFilterStore", () => ({ useSavedFilterStore: () => savedFilterStore }));

function savedFilter(savedFilters: Record<string, unknown>): SavedFilterDto {
  return {
    id: "saved-filter",
    name: "Mon filtre",
    filters: savedFilters,
    createdAt: new Date("2026-10-15T00:00:00Z"),
  };
}

function renderPanel() {
  return render(SavedFiltersPanel, {
    global: {
      stubs: {
        Teleport: true,
        DsfrButton: {
          props: ["label", "disabled"],
          template: '<button :disabled="disabled">{{ label }}</button>',
        },
        DsfrModal: {
          props: ["opened"],
          template: '<div v-if="opened"><slot /><slot name="footer" /></div>',
        },
        DsfrInputGroup: {
          props: ["modelValue"],
          emits: ["update:modelValue"],
          template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        DsfrButtonGroup: { template: "<div><slot /></div>" },
        VIcon: true,
      },
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  filters.value = { ...structuredClone(DEFAULT_FILTERS), technologyEolStatus: "eol", page: 3 };
  savedFilterStore.savedFilters = [];
  savedFilterStore.saveFilter.mockResolvedValue(savedFilter({ technologyEolStatus: "eol" }));
  // Le composable fusionne les filtres : une clé absente conserve sa valeur courante.
  setFilter.mockImplementation((values: Partial<Filters>) => Object.assign(filters.value, values));
});

afterEach(cleanup);

describe("SavedFiltersPanel — filtre de fin de vie des technologies", () => {
  it("conserve le statut de fin de vie lors de la sauvegarde des filtres actuels", async () => {
    renderPanel();

    await fireEvent.click(screen.getByTestId("save-filter-button"));
    await fireEvent.update(screen.getByTestId("save-filter-name-input"), " Technologies en fin de vie ");
    await fireEvent.click(screen.getByTestId("confirm-save-filter-button"));

    expect(savedFilterStore.saveFilter).toHaveBeenCalledExactlyOnceWith(
      "Technologies en fin de vie",
      expect.objectContaining({ technologyEolStatus: "eol" }),
    );
  });

  it("remplace le statut courant par le statut sauvegardé et revient à la première page", async () => {
    filters.value.technologyEolStatus = "eol-soon";
    savedFilterStore.savedFilters = [savedFilter({ technologyEolStatus: "eol", page: 2 })];
    renderPanel();

    await fireEvent.click(screen.getByTestId("saved-filter-apply-saved-filter"));

    expect(filters.value.technologyEolStatus).toBe("eol");
    expect(filters.value.page).toBe(0);
    expect(setFilter).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ technologyEolStatus: "eol", page: 0 }));
  });

  it("efface le statut courant quand le filtre sauvegardé ne contient pas de statut de fin de vie", async () => {
    // Une valeur undefined disparaît de l'objet JSON enregistré côté serveur.
    savedFilterStore.savedFilters = [savedFilter({ search: "application métier" })];
    renderPanel();

    await fireEvent.click(screen.getByTestId("saved-filter-apply-saved-filter"));

    expect(filters.value.technologyEolStatus).toBeUndefined();
    expect(filters.value.search).toBe("application métier");
    expect(setFilter).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ technologyEolStatus: undefined, page: 0 }));
  });
});
