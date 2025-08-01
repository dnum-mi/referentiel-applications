import type { Hosting } from "@/models/Hosting";
import requests from "./xhr-client";
import axios from "axios";

const Hostings = {
  async countHostings(): Promise<number> {
    const { data } = await axios.get("hostings/count");
    return data;
  },

  async getHostingsByApplicationId(applicationId: string): Promise<Hosting[]> {
    return await requests.get(`/applications/${applicationId}/hostings`);
  },

  async create(hosting: Hosting, applicationId: string): Promise<Hosting> {
    const payload = {
      label: hosting.label,
      applicationId,
      hostingOptionId: hosting.hostingOptionId,
    };
    return await requests.post(`/applications/${applicationId}/hostings`, payload);
  },

  async update(hostingId: string, hosting: Hosting, applicationId: string): Promise<Hosting> {
    const payload = {
      label: hosting.label,
      applicationId,
      hostingOptionId: hosting.hostingOptionId,
    };
    return await requests.patch(`/applications/${applicationId}/hostings/${hostingId}`, payload);
  },

  async delete(hostingId: string, applicationId: string): Promise<void> {
    return await requests.del(`/applications/${applicationId}/hostings/${hostingId}`);
  },
};

export default Hostings;
