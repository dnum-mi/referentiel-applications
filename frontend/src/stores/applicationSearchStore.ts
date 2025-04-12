import { defineStore } from "pinia";
import { ref, reactive, computed } from "vue";
import { call } from "@/api/callService";

export const useApplicationSearchStore = defineStore("applicationSearchStore", () => {
  const results = ref<any[]>([]);
  const total = ref(0);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const filters = reactive({
    label: "",
    shortName: "",
    tag: [],
    link: "",
    priorityRestart: [],
    page: 0,
    limit: 15,
    sortBy: "label",
    order: "asc",
    hostingSite: "",
    hostingPlatform: "",
    organizationLabel: "",
    actorType: "", // ✅ maintenant un tableau !
  });

  const page = computed({
    get: () => filters.page,
    set: (val) => (filters.page = val),
  });

  const limit = computed({
    get: () => filters.limit,
    set: (val) => (filters.limit = val),
  });

  function setFilter(key: keyof typeof filters, value: any) {
    filters[key] = value;
  }

  function resetFilters() {
    Object.assign(filters, {
      label: "",
      shortName: "",
      tag: [],
      link: "",
      priorityRestart: [],
      page: 0,
      limit: 15,
      sortBy: "label",
      order: "asc",
      hostingSite: "",
      hostingPlatform: "",
      organizationLabel: "",
      actorType: [], // ✅ reset propre
    });
  }

  async function searchApplications(customFilters = {}) {
    isLoading.value = true;
    error.value = null;

    try {
      const rawQuery = { ...filters, ...customFilters };

      const query = Object.fromEntries(
        Object.entries(rawQuery).filter(
          ([_, val]) => val !== "" && val !== null && val !== undefined && !(Array.isArray(val) && val.length === 0),
        ),
      );

      query.page ??= 0;
      query.limit ??= 15;

      console.log("🔍 [searchApplications] Filtres bruts:", rawQuery);
      console.log("🧪 [searchApplications] Filtres envoyés (query):", query);

      const res = await call("applicationSearch", undefined, query);
      results.value = res.results;
      total.value = res.total;
    } catch (err: any) {
      error.value = err?.message || "Erreur inconnue";
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
    searchApplications,
    setFilter,
    resetFilters,
  };
});
