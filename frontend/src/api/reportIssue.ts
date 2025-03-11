import type { ReportIssue } from "../models/ReportIssue";
import requests from "./xhr-client";

const reportIssue = {
  async createReportIssue(data: Promise<ReportIssue[]>) {
    return await requests.post<ReportIssue[]>("/anomaly-notifications", data);
  },
  async getReportIssue() {
    return await requests.get<ReportIssue[]>("/anomaly-notifications");
  },
  async getNotificationsByApplicationId(applicationId: string) {
    console.log("Requesting notifications for applicationId:", applicationId);
    const response = await requests.get<ReportIssue[]>(`/anomaly-notifications?applicationId=${applicationId}`);
    console.log(response);
    return response;
  },
  async getReportIssueByNotifierId(): Promise<ReportIssue[]> {
    return await requests.get<ReportIssue[]>("/anomaly-notifications/user-notifications");
  },
  async deleteReportIssue(id: string) {
    return await requests.del(`/anomaly-notifications/${id}`);
  },
};

export default reportIssue;
