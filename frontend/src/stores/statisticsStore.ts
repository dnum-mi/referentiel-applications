import type { CountByIqDto, CountByMonthDto, GetIqAvgGroupedDto } from "@/client/types.gen";
import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/api/index";

async function countApplicationsByMonth(): Promise<CountByMonthDto[]> {
  const response = await api.applicationControllerCountByMonth();
  if (!response.response.ok || !response.data) {
    throw new Error("Erreur lors de la récupération des applications par mois");
  }
  return response.data;
}

async function countApplicationsByIq(): Promise<CountByIqDto[]> {
  const response = await api.applicationControllerCountByIq();
  if (!response.response.ok || !response.data) {
    throw new Error("Erreur lors de la récupération des applications par IQ");
  }
  return response.data;
}

export const useStatisticsStore = defineStore("statisticsStore", () => {
  const totalApplications = ref<number | null>(null);
  const technicalDebtPointTotal = ref<number | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const iqStats = ref<GetIqAvgGroupedDto[]>([]);
  const totalCompliances = ref<number>(0);

  async function countApplications(force = false) {
    // Le total (non filtré) ne bouge pas au fil des recherches : on ne le
    // recharge pas s'il est déjà connu, et on ne demande qu'une ligne — seul
    // `total` nous intéresse, pas les fiches complètes.
    if (!force && totalApplications.value !== null) return;
    const response = await api.applicationControllerSearch({ query: { pageSize: 1 } });
    totalApplications.value = response.data?.total ?? 0;
  }

  function countTechnicalDebtPoints(count: number) {
    technicalDebtPointTotal.value = count;
  }

  async function fetchIqStats(from?: string, to?: string, groupBy: "day" | "week" | "month" | "year" = "month") {
    isLoading.value = true;
    error.value = null;
    const response = await api.statsControllerGetIqAvgGrouped({ query: { from, to, groupBy } });
    if (!response.response.ok) {
      throw new Error("Erreur lors de la récupération des stats IQ");
    }
    if (!response.data || !Array.isArray(response.data)) {
      throw new Error("Données de stats IQ invalides");
    }
    iqStats.value = response.data;
  }

  // fetch total compliance count
  const countCompliances = async (): Promise<number> => {
    const response = await api.complianceControllerCountAllCompliances();
    if (!response.response.ok) {
      throw new Error("Erreur lors du comptage des conformités.");
    }
    totalCompliances.value = response.data ?? 0;
    return totalCompliances.value;
  };

  return {
    // State properties
    iqStats,
    totalApplications,
    technicalDebtPointTotal,
    isLoading,
    totalCompliances,
    error,

    // Methods
    countCompliances,
    countApplications,
    countApplicationsByMonth,
    countApplicationsByIq,
    fetchIqStats,
    countTechnicalDebtPoints,
  };
});
