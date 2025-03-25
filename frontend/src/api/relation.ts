import type { Relation } from "@/models/Application";
import requests from "./xhr-client";

const Relations = {
  async create(applicationSourceId: string, applicationTargetId: string, type: string): Promise<void> {
    const payload = {
      applicationSource: applicationSourceId,
      applicationTarget: applicationTargetId,
      type: type,
    };
    return await requests.post("/relations", payload);
  },

  async getAll(): Promise<Relation[]> {
    return await requests.get<Relation[]>("/relations");
  },

  async update(id: string, data: Partial<{ applicationSource: string; applicationTarget: string; type: string }>): Promise<Relation> {
    return await requests.patch<Relation>(`/relations/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return await requests.del(`/relations/${id}`);
  },
};

export default Relations;
