import { defineStore } from "pinia";
import { ref } from "vue";
import { call } from "@/api/callService";
import Stats from "@/api/stats";

export const useStatisticsStore = defineStore("statisticsStore", () => {
  const totalApplications = ref<number | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
   const iqMonthlyStats = ref<{ date: string; valeur: number }[]>([]);

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

  async function countApplications() {
    totalApplications.value = await call("application", "countByStatus");
  }

  async function countApplicationsByMonth(): Promise<{ month: string; total: number }[]> {
    return await call("application", "countByMonth");
  }

  async function countApplicationsByIq(): Promise<{ iq: number; total: number }[]> {
    return await call("application", "countByIq");
  }

  async function fetchMonthlyIqStats() {
    try {
      const stats = await Stats.getMonthlyIqStats();
      iqMonthlyStats.value = stats;
    } catch (err: any) {
      error.value = err.message ?? "Erreur lors du chargement des stats IQ";
    }
  }

  return {
    totalApplications,
    iqMonthlyStats,
    isLoading,
    error,
    fetchTotalApplications,
    fetchMonthlyIqStats,
    countApplications,
    countApplicationsByMonth,
    countApplicationsByIq,
  };
});
