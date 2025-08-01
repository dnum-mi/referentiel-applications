import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/api/index";
import type { AnomalyNotificationsControllerFindAllData, CreateAnomalyNotificationRequestDto, GetAnomalyNotificationDto } from "@/client/types.gen";

export type reportIssueFilter = Exclude<AnomalyNotificationsControllerFindAllData["query"], undefined>;

export const useReportIssueStore = defineStore("reportIssueStore", () => {
  const userReports = ref<GetAnomalyNotificationDto[]>([]);
  const allReports = ref<GetAnomalyNotificationDto[]>([]);
  const issues = ref<GetAnomalyNotificationDto[]>([]);
  const isLoading = ref(false);

  const defaultFilters: reportIssueFilter = {
    searchReport: "",
    sortBy: "application",
    order: "asc",
    page: 0,
    limit: 15,
  };

  const filters = ref<reportIssueFilter>(defaultFilters);

  const page = computed({
    get: () => filters.value.page,
    set: val => (filters.value.page = val),
  });

  const limit = computed({
    get: () => filters.value.limit,
    set: val => (filters.value.limit = val),
  });

  function setFilter(key: keyof typeof filters, value: any) {
    filters[key] = value;
  }

  function resetFilters() {
    Object.assign(filters, defaultFilters);
  }

  const fetchMyReports = async () => {
    try {
      const response = await api.anomalyNotificationsControllerFindAll();
      if (!response.response.ok) {
        throw new Error("Erreur lors de la récupération des notifications d'anomalies");
      }
      if (!response.data) {
        console.warn("Aucune notification d'anomalie trouvée pour l'utilisateur actuel.");
      }
      userReports.value = response.data ?? [];
    } catch (error) {
      console.error("❌ Erreur lors du chargement des signalements : ", error);
    }
  };

  const fetchAllReports = async (customFilters?: reportIssueFilter) => {
    try {
      isLoading.value = true;

      const query: reportIssueFilter = { ...filters.value, ...customFilters };

      query.all = true;

      const response = await api.anomalyNotificationsControllerFindAll({ query });

      if (!response.response.ok) {
        throw new Error("Erreur lors de la récupération des notifications d'anomalies");
      }
      if (!response.data) {
        console.warn("Aucune notification d'anomalie trouvée pour l'utilisateur actuel.");
      }
      allReports.value = response.data ?? [];
    } catch (err) {
      console.error("❌ Erreur lors du chargement des signalements :", err);
    } finally {
      isLoading.value = false;
    }
  };

  const fetchIssueByApplication = async (applicationId: string) => {
    isLoading.value = true;
    try {
      const response = await api.applicationAnomalyNotificationsControllerFindAll({ path: { applicationId } });
      if (!response.response.ok) {
        throw new Error("Erreur lors de la récupération des signalements pour l'application");
      }
      if (!response.data) {
        console.warn(`Aucun signalement trouvé pour l'application avec ID ${applicationId}.`);
      }
      issues.value = response.data ?? [];
    } catch (error) {
      console.error("❌ Erreur lors du chargement des signalements : ", error);
    } finally {
      isLoading.value = false;
    }
  };

  const proposeAnomaly = async (description: string) => {
    const payload = {
      description,
    };

    try {
      const response = await api.anomalyNotificationsControllerCreate({ body: payload });
      if (!response.response.ok) {
        throw new Error("Erreur lors de la proposition d'anomalie");
      }
      if (!response.data) {
        console.warn("Aucune donnée retournée lors de la proposition d'anomalie.");
      }
    } catch (err) {
      console.error("❌ Erreur lors de la proposition d'anomalie :", err);
      throw err;
    }
  };

  const proposeCorrection = async (applicationId: string, description: string) => {
    const payload: CreateAnomalyNotificationRequestDto = {
      applicationId,
      description,
    };

    try {
      const response = await api.applicationAnomalyNotificationsControllerCreate({ path: { applicationId }, body: payload });
      if (!response.response.ok) {
        throw new Error("Erreur lors de la proposition de correction");
      }
      if (!response.data) {
        console.warn("Aucune donnée retournée lors de la proposition de correction.");
      }
    } catch (err) {
      console.error("❌ Erreur lors de la proposition de correction :", err);
      throw err;
    }
  };

  async function updateReport(id: string, applicationId: string, status: "in_pending" | "in_progress" | "done") {
    try {
      if (applicationId) {
        await api.applicationAnomalyNotificationsControllerUpdate({ path: { applicationId, id }, body: { status } });
      } else {
        await api.anomalyNotificationsControllerUpdate({ path: { id }, body: { status } });
      }
      return true;
    } catch (error) {
      console.log("Erreur lors de l'enregistrement des modifications : ", error);
    } finally {
      fetchAllReports();
    }
  };

  return {
    issues,
    userReports,
    allReports,
    isLoading,
    fetchMyReports,
    fetchAllReports,
    proposeCorrection,
    proposeAnomaly,
    fetchIssueByApplication,
    filters,
    page,
    limit,
    setFilter,
    resetFilters,
    updateReport,
  };
});
