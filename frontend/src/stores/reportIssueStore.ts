// src/stores/reportIssueStore.ts
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { ReportIssue } from "@/models/ReportIssue";
import { call } from "@/api/callService";

export const useReportIssueStore = defineStore("reportIssueStore", () => {
  const reports = ref<ReportIssue[]>([]);
  const myReports = computed(() => reports.value);
  const isLoading = ref(false);

  const fetchMyReports = async () => {
    try {
      const res = await call("reportIssue", "getByNotifierId");
      reports.value = res || [];
    } catch (error) {
      console.error("❌ Erreur lors du chargement des signalements : ", error);
    }
  };

  const fetchAllReports = async () => {
    try {
      isLoading.value = true;
      const result = await call("reportIssue", "getAll");
      reports.value = result;
    } catch (err) {
      console.error("❌ Erreur lors du chargement des signalements :", err);
    } finally {
      isLoading.value = false;
    }
  };

  const proposeCorrection = async (applicationId: string, description: string) => {
    const payload: ReportIssue = {
      applicationId,
      description,
      status: "in_pending",
    };

    try {
      const res = await call("reportIssue", "create", payload);
      reports.value = [...reports.value, res];
      return res;
    } catch (err) {
      console.error("❌ Erreur lors de la proposition de correction :", err);
      throw err;
    }
  };

  return {
    reports,
    myReports,
    isLoading,
    fetchMyReports,
    fetchAllReports,
    proposeCorrection,
  };
});
