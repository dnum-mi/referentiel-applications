import requests from "./xhr-client";
import type { Compliance } from "@/models/Application";

const baseUrl = (applicationId: string) => `/applications/${applicationId}/compliances`;

export default class CompliancesApi {
  static async countCompliances(): Promise<number> {
    return requests.get(`compliances/count`);
  }

  static async getCompliance(applicationId: string): Promise<Compliance> {
    return requests.get(baseUrl(applicationId));
  }

  static async createCompliance(applicationId: string, compliance: Partial<Compliance>): Promise<Compliance> {
    delete compliance.id;
    return requests.post(baseUrl(applicationId), compliance);
  }

  static async updateCompliance(applicationId: string, compliance: Partial<Compliance>): Promise<Compliance> {
    delete compliance.id;
    delete compliance.applicationId;
    return requests.patch(baseUrl(applicationId), compliance);
  }
}
