import { defineStore } from "pinia";
import { ref } from "vue";
import { call } from "@/api/callService";
import Stats from "@/api/stats";
import type { GroupBy, IqAvg } from "@/models/Stat";

export const useStatisticsStore = defineStore("statisticsStore", () => {
  const totalApplications = ref<number | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const iqStats = ref<IqAvg[]>([]);

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

  async function countApplicationsByMonth(): Promise<{ month: string, total: number }[]> {
    return await call("application", "countByMonth");
  }

  async function countApplicationsByIq(): Promise<{ iq: number, total: number }[]> {
    return await call("application", "countByIq");
  }

  async function fetchIqStats(from?: string, to?: string, groupBy: GroupBy = "month") {
    isLoading.value = true;
    error.value = null;
    try {
      const result = await Stats.getIqAvgGrouped(from, to, groupBy);
      iqStats.value = result;
    } catch (err: any) {
      console.error("🔍 fetchIqStats error:", err);
      error.value = err.message ?? "Erreur lors du chargement des stats IQ";
    } finally {
      isLoading.value = false;
    }
  }

  return {
    // State properties
    iqStats,
    totalApplications,
    isLoading,
    error,

    // Methods
    fetchTotalApplications,
    countApplications,
    countApplicationsByMonth,
    countApplicationsByIq,
    fetchIqStats,
  };
});
