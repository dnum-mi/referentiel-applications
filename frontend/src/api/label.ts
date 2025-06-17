import type { Label } from "@/models/Application";
import axios from "axios";

const Labels = {
  async create(labels: Label[], applicationId: string): Promise<Label[]> {
    return await Promise.all<Label>(labels.map((label) => axios.post(`applications/${applicationId}/labels`, label)));
  },

  async update(labels: Label[]): Promise<Label[]> {
    return await Promise.all<Label>(
      labels.map((label) =>
        axios.patch(`applications/${label.applicationId}/labels/${label.id}`, {
          source: label.source,
          value: label.value,
        }),
      ),
    );
  },

  async delete(labelIds: string[], applicationId: string): Promise<Label[]> {
    return await Promise.all<Label>(labelIds.map((labelId) => axios.delete(`applications/${applicationId}/labels/${labelId}`)));
  },

  async findByApplication(applicationId: string): Promise<Label[]> {
    const response = await axios.get<Label[]>(`applications/${applicationId}/labels`);
    return response.data;
  },
};

export default Labels;
