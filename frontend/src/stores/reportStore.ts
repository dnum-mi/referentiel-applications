import type { CreateReportRequestDto, ReportStatus } from "@/client/types.gen";
import { defineStore } from "pinia";
import api from "@/api/index";

export const useReportStore = defineStore("reportStore", () => {
  const proposeGlobalReport = async (description: string) => {
    const payload = {
      description,
    };

    try {
      const response = await api.reportsControllerCreate({ body: payload });
      if (!response.response.ok) {
        throw new Error("Erreur lors de la création du signalement");
      }
      if (!response.data) {
        console.warn("Aucune donnée retournée lors de la création du signalement.");
      }
    } catch (err) {
      console.error("❌ Erreur lors de la création du signalement :", err);
      throw err;
    }
  };

  const proposeReport = async (applicationId: string, description: string) => {
    const payload: CreateReportRequestDto = {
      applicationId,
      description,
    };

    try {
      const response = await api.applicationReportsControllerCreate({ path: { applicationId }, body: payload });
      if (!response.response.ok) {
        throw new Error("Erreur lors de la création du signalement");
      }
      if (!response.data) {
        console.warn("Aucune donnée retournée lors de la création du signalement.");
      }
    } catch (err) {
      console.error("❌ Erreur lors de la création du signalement :", err);
      throw err;
    }
  };

  async function updateReport(id: string, applicationId: string, status: ReportStatus, notify: boolean = false) {
    try {
      if (applicationId) {
        await api.applicationReportsControllerUpdate({ path: { applicationId, id }, body: { status }, query: { notify } });
      } else {
        await api.reportsControllerUpdate({ path: { id }, body: { status }, query: { notify } });
      }
      return true;
    } catch (error) {
      console.error("Erreur lors de l'enregistrement des modifications : ", error);
    }
  }

  async function updateNotes(id: string, notes: string = "", notify: boolean = false) {
    try {
      await api.reportsControllerUpdate({ path: { id }, body: { notes }, query: { notify } });
      return true;
    } catch (error) {
      console.error("Erreur lors de l'enregistrement des modifications : ", error);
    }
  }

  return {
    proposeReport,
    proposeGlobalReport,
    updateReport,
    updateNotes,
  };
});
