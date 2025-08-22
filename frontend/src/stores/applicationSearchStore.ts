import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "@/api/index.js";
import type { ApplicationControllerSearchData } from "@/client/types.gen.js";

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
    status: undefined,
    page: 0,
    limit: 15,
    sortBy: "label",
    order: "asc",
    hostingSearch: undefined,
    organizationLabel: undefined,
    actorType: undefined,
    iqGte: undefined,
    iqLte: undefined,
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

  function setFilter<T extends keyof Filters>(key: T, value: Filters[T]) {
    filters.value[key] = value;
  }

  function resetFilters() {
    filters.value = { ...initialFilters };
  }

  async function searchApplications(customFilters?: Filters, store: boolean = true) {
    isLoading.value = true;
    error.value = null;

    try {
      const query = customFilters || filters.value;

      const response = await api.applicationControllerSearch({
        query,
      });
      if (!response.response.ok || !response.data) {
        throw new Error("Erreur lors de la recherche d'applications");
      }
      console.log("🧾 Résultat API /applications/search →", response.data);
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
    resetFilters,
  };
});
