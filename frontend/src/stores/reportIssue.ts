// src/stores/reportIssueStore.ts

import { defineStore } from "pinia";
import reportIssue from "@/api/reportIssue";
import type { ReportIssue } from "@/models/ReportIssue";

export const useReportIssueStore = defineStore("ReportIssueStore", {
  state: () => ({
    report: [] as ReportIssue[],
  }),

  actions: {
    async proposeCorrection(applicationId: string, correctionText: string) {
      const payload: ReportIssue = {
        applicationId,
        description: correctionText,
        status: "in_pending",
      };

      const response = await reportIssue.createReportIssue(payload);
      console.log(response);

      this.report = [...this.report, response.data];

      return response;
    },

    // Option supplémentaire: Fonction pour re-fetcher les anomalies
    async fetchAnomalies() {
      try {
        const response = await reportIssue.getAnomalies(); // Assurez-vous d'implémenter cette méthode
        this.anomalies = response.data;
      } catch (error) {
        console.error("Erreur lors du fetch des anomalies :", error);
      }
    },
  },
});
