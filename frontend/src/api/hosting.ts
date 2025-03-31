import axios from "axios";
import type { Hosting } from "@/models/Hosting";
import requests from "./xhr-client";

const Hostings = {
  async getHostingsByApplicationId(applicationId: string): Promise<Hosting[]> {
    return await requests.get(`/applications/${applicationId}/hostings`);
  },

  async create(hosting: Hosting, applicationId: string): Promise<Hosting> {
    const payload = {
      provider: hosting.provider,
      label: hosting.label,
      region: hosting.region,
      site: hosting.site,
      nature: hosting.nature,
      platform: hosting.platform,
      applicationId: applicationId,
    };
    return await requests.post(`/applications/${applicationId}/hostings`, payload);
  },

  async update(hostingId: string, hosting: Hosting, applicationId: string): Promise<Hosting> {
    const payload = {
      provider: hosting.provider,
      label: hosting.label,
      region: hosting.region,
      site: hosting.site,
      nature: hosting.nature,
      platform: hosting.platform,
      applicationId: applicationId,
    };
    return await requests.patch(`/applications/${applicationId}/hostings/${hostingId}`, payload);
  },

  async delete(hostingId: string, applicationId: string): Promise<void> {
    return await requests.del(`/applications/${applicationId}/hostings/${hostingId}`);
  },
};

export default Hostings;
