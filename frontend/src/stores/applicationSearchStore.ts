import { ref, computed, watch } from "vue";
import api from "@/api/index.js";
import type { ApplicationControllerSearchData } from "@/client/types.gen.js";
import { useDebouncedFn } from "@/composables/use-debouncefn";

export type Filters = Exclude<ApplicationControllerSearchData["query"], undefined>;

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
    limit: 15,
    sortBy: "label",
    order: "asc",
    hostingSearch: undefined,
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

  const limit = computed({
    get: () => filters.value.limit,
    set: val => (filters.value.limit = val),
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
      const query = cleanFilters(customFilters || filters.value);

      const response = await api.applicationControllerSearch({
        query,
      });
      if (!response.response.ok || !response.data) {
        throw new Error("Erreur lors de la recherche d'applications");
      }
      console.log("🧾 Résultat API /applications →", response.data);
      console.log("📊 Total applications retournées :", response.data.total);

      if (store) {
        results.value = response.data.results;
        total.value = response.data.total;
      }
      return response.data;
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
    limit,
    isLoading,
    error,
    initialFilters,
    searchApplications,
    setFilter,
    setOrder,
    resetFilters,
  };
});
