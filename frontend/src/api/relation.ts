import type { Relation } from "@/models/Application";
import requests from "./xhr-client";

const Relations = {
  async create(applicationSourceId: string, applicationTargetId: string, type: string): Promise<void> {
    const payload = {
      applicationTargetId: applicationTargetId,
      type: type,
    };
    return requests.post(`/applications/${applicationSourceId}/relations`, payload);
  },

  async getAllForApplication(applicationSourceId: string): Promise<Relation[]> {
    return requests.get<Relation[]>(`/applications/${applicationSourceId}/relations`);
  },

  async update(applicationSourceId: string, id: string, data: Partial<{ type: string; applicationTargetId: string }>): Promise<Relation> {
    return requests.patch<Relation>(`/applications/${applicationSourceId}/relations/${id}`, data);
  },

  async delete(applicationSourceId: string, id: string): Promise<void> {
    return requests.del(`/applications/${applicationSourceId}/relations/${id}`);
  },
};

export default Relations;
