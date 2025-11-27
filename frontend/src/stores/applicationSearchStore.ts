import type { ApplicationControllerSearchData, ApplicationStatus } from "@/client/types.gen.js";
import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import api from "@/api/index.js";
import { useDebouncedFn } from "@/composables/use-debouncefn";

export type Filters = Exclude<ApplicationControllerSearchData["query"], undefined> & {
  hostingSite?: string
  hostingPlatform?: string
  hostingProvider?: string
  hostingBuilding?: string
  hostingRoom?: string
  currentStatus__in?: Array<ApplicationStatus>
  compliance__in?: Array<"dima" | "pdma" | "homologation" | "rgaa" | "dsfr" | "rgpd">
};

export const useApplicationSearchStore = defineStore("applicationSearchStore", () => {
  const results = ref<any[]>([]);
  const total = ref(0);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const initialFilters = {
    shortName: undefined,
    tag: [],
    link: undefined,
    priorityRestart: undefined,
    currentStatus__in: ["under_construction", "poc", "in_production_mvp", "in_production", "in_production_decommissioning", "decommissioned"],
    compliance__in: undefined,
    page: 0,
    pageSize: 15,
    sortBy: "label",
    order: "asc",
    hostingSite: undefined,
    hostingPlatform: undefined,
    hostingProvider: undefined,
    hostingBuilding: undefined,
    hostingRoom: undefined,
    organization: undefined,
    actorType: undefined,
    actorEmail: undefined,
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

    return cleaned;
  }

  async function searchApplications(customFilters?: Filters, store: boolean = true) {
    isLoading.value = true;
    error.value = null;

    try {
      const currentFilters = customFilters ?? filters.value;
      const query: Filters = cleanFilters(currentFilters);

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
