import { defineStore } from "pinia";
import { ref } from "vue";
import type { ReportIssue } from "@/models/ReportIssue";
import { call } from "@/api/callService";

export const useReportIssueStore = defineStore("reportIssueStore", () => {
  const userReports = ref<ReportIssue[]>([]);
  const allReports = ref<ReportIssue[]>([]);
  const reports = ref<ReportIssue[]>([]);
  const issues = ref<ReportIssue[]>([]);
  const isLoading = ref(false);

  const fetchMyReports = async () => {
    try {
      const res = await call("reportIssue", "getByNotifierId");
      userReports.value = res || [];
    } catch (error) {
      console.error("❌ Erreur lors du chargement des signalements : ", error);
    }
  };

  const fetchAllReports = async () => {
    try {
      isLoading.value = true;
      const result = await call("reportIssue", "getAll");
      allReports.value = result;
    } catch (err) {
      console.error("❌ Erreur lors du chargement des signalements :", err);
    } finally {
      isLoading.value = false;
    }
  };

  const fetchIssueByApplication = async (applicationId: string) => {
    isLoading.value = true;
    try {
      const res = await call("reportIssue", "getByAppId", { applicationId });
      issues.value = res || [];
    } catch (error) {
      console.error("❌ Erreur lors du chargement des signalements : ", error);
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
