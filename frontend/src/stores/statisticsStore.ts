import { defineStore } from "pinia";
import { ref } from "vue";
import { call } from "@/api/callService";

export const useStatisticsStore = defineStore("statisticsStore", () => {
  const totalApplications = ref<number | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  async function fetchTotalApplications() {
    try {
      isLoading.value = true;
      error.value = null;
      const apps = await call("application", "list");
      totalApplications.value = apps.length;
    } catch (err: any) {
      error.value = err.message ?? "Erreur inconnue";
    } finally {
      isLoading.value = false;
    }
  }

  return {
    totalApplications,
    isLoading,
    error,
    fetchTotalApplications,
  };
});
