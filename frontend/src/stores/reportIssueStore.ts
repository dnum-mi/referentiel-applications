import type { CreateAnomalyNotificationRequestDto } from "@/client/types.gen";
import { defineStore } from "pinia";
import api from "@/api/index";

export const useReportIssueStore = defineStore("reportIssueStore", () => {
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

  async function updateReport(id: string, applicationId: string, status: "in_pending" | "in_progress" | "done", notify: boolean = false) {
    try {
      if (applicationId) {
        await api.applicationAnomalyNotificationsControllerUpdate({ path: { applicationId, id }, body: { status } });
      } else {
        await api.anomalyNotificationsControllerUpdate({ path: { id }, body: { status }, query: { notify } });
      }
      return true;
    } catch (error) {
      console.log("Erreur lors de l'enregistrement des modifications : ", error);
    }
  }

  async function updateDescription(id: string, description: string, notify: boolean = false) {
    try {
      await api.anomalyNotificationsControllerUpdate({ path: { id }, body: { description }, query: { notify } });
      return true;
    } catch (error) {
      console.log("Erreur lors de l'enregistrement des modifications : ", error);
    }
  }

  return {
    proposeCorrection,
    proposeAnomaly,
    updateReport,
    updateDescription,
  };
});
