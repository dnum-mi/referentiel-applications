import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/api/index.js";
import type { CreateAnomalyNotificationRequestDto, GetAnomalyNotificationDto } from "@/client/types.gen.js";

export const useReportIssueStore = defineStore("reportIssueStore", () => {
  const userReports = ref<GetAnomalyNotificationDto[]>([]);
  const allReports = ref<GetAnomalyNotificationDto[]>([]);
  const issues = ref<GetAnomalyNotificationDto[]>([]);
  const isLoading = ref(false);

  const fetchMyReports = async () => {
    try {
      const response = await api.applicationAnomalyNotificationsControllerFindByCurrentUser();
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

  const fetchAllReports = async () => {
    try {
      isLoading.value = true;
      const response = await api.applicationAnomalyNotificationsControllerFindAll();
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
      const response = await api.applicationAnomalyNotificationsControllerFindAll({ query: { applicationId } });
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

  const proposeCorrection = async (applicationId: string, description: string) => {
    const payload: CreateAnomalyNotificationRequestDto = {
      applicationId,
      description,
    };

    try {
      const response = await api.applicationAnomalyNotificationsControllerCreate({ body: payload });
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

  return {
    issues,
    userReports,
    allReports,
    isLoading,
    fetchMyReports,
    fetchAllReports,
    proposeCorrection,
    fetchIssueByApplication,
  };
});
