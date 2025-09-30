import { ref, computed, watch } from "vue";
import { defineStore } from "pinia";
import api from "@/api/index.js";
import type { ApplicationControllerSearchData } from "@/client/types.gen.js";
import { useDebouncedFn } from "@/composables/use-debouncefn";

export type Filters = Exclude<ApplicationControllerSearchData["query"], undefined> & {
  // Frontend-only hosting filters that get converted to hostingSearch
  hostingSite?: string
  hostingPlatform?: string
  hostingProvider?: string
  hostingBuilding?: string
  hostingRoom?: string
};

export const useApplicationSearchStore = defineStore("applicationSearchStore", () => {
  const results = ref<any[]>([]);
  const total = ref(0);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const initialFilters = {
    label: undefined,
    shortName: undefined,
    tag: undefined,
    link: undefined,
    priorityRestart: undefined,
    status__in: ["under_construction", "in_production_mvp", "in_production", "in_production_decommissioning", "decommissioned"],
    page: 0,
    pageSize: 15,
    sortBy: "label",
    order: "asc",
    hostingSearch: undefined,
    hostingSite: undefined,
    hostingPlatform: undefined,
    hostingProvider: undefined,
    hostingBuilding: undefined,
    hostingRoom: undefined,
    organization: undefined,
    actorType: undefined,
    iqGte: 0,
    iqLte: 100,
    search: undefined,
  } as const satisfies Filters;

  const filters = ref<Filters>(initialFilters);

  const page = computed({
    get: () => filters.value.page,
    set: val => (filters.value.page = val),
  });

  const pageSize = computed({
    get: () => filters.value.pageSize,
    set: val => (filters.value.pageSize = val),
  });

  const { run: debouncedSearch } = useDebouncedFn(() => {
    searchApplications();
  }, 300);

  watch(filters, () => {
    debouncedSearch();
  }, { deep: true, immediate: true });

  function setFilter<T extends keyof Filters>(values: Partial<Pick<Filters, T>>) {
    filters.value = { ...filters.value, ...values };
  }

  function setOrder(ascending: boolean) {
    filters.value.order = ascending ? "asc" : "desc";
  }

  function resetFilters() {
    filters.value = { ...initialFilters };
  }

  function cleanFilters(filters: Filters): Filters {
    const cleaned: Filters = { ...filters };
    Object.entries(cleaned).forEach(([key, value]) => {
      if (typeof value === "number") {
        return;
      }
      if (
        value == null
        || value === ""
        || (Array.isArray(value) && value.length === 0)
      ) {
        delete cleaned[key as keyof Filters];
      }
    });

    // Convert frontend hosting filters to backend hostingSearch
    const { hostingSite, hostingPlatform, hostingProvider, hostingBuilding, hostingRoom, ...backendFilters } = cleaned;

    // Build hostingSearch from individual hosting filters
    const hostingSearchTerms = [hostingSite, hostingPlatform, hostingProvider, hostingBuilding, hostingRoom].filter(Boolean);

    if (hostingSearchTerms.length > 0) {
      (backendFilters as any).hostingSearch = hostingSearchTerms.join(" ");
    }

    return backendFilters as Filters;
  }

  async function searchApplications(customFilters?: Filters, store: boolean = true) {
    isLoading.value = true;
    error.value = null;

    try {
      const currentFilters = customFilters ?? filters.value;
      const query = cleanFilters(currentFilters);

      const response = await api.applicationControllerSearch({
        query,
      });
      if (!response.response.ok || !response.data) {
        throw new Error("Erreur lors de la recherche d'applications");
      }
      console.log("🧾 Résultat API /applications →", response.data);
      console.log("📊 Total applications retournées :", response.data.total);

      const searchResults = response.data.results;

      if (store) {
        results.value = searchResults;
        total.value = response.data.total;
      }
      return {
        ...response.data,
        results: searchResults,
        total: response.data.total,
      };
    } catch (err: any) {
      error.value = err?.message || "Erreur inconnue";
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    filters,
    results,
    total,
    page,
    pageSize,
    isLoading,
    error,
    initialFilters,
    searchApplications,
    setFilter,
    setOrder,
    resetFilters,
  };
});
