import requests from "./xhr-client";
import type { Compliance } from "@/models/Application";

const baseUrl = (applicationId: string) => `/applications/${applicationId}/compliances`;

export default class CompliancesApi {
  static async getCompliances(applicationId: string): Promise<Compliance[]> {
    return await requests.get(baseUrl(applicationId));
  }

  static async getCompliance(applicationId: string, id: string): Promise<Compliance> {
    return await requests.get(`${baseUrl(applicationId)}/${id}`);
  }

  static async createCompliance(applicationId: string, compliance: Partial<Compliance>): Promise<Compliance> {
    delete compliance.id;
    return await requests.post(baseUrl(applicationId), compliance);
  }

  static async updateCompliance(applicationId: string, id: string, compliance: Partial<Compliance>): Promise<Compliance> {
    delete compliance.id;
    delete compliance.applicationId;
    return await requests.patch(`${baseUrl(applicationId)}/${id}`, compliance);
  }

  static async deleteCompliance(applicationId: string, id: string): Promise<void> {
    await requests.del(`${baseUrl(applicationId)}/${id}`);
  }
}
