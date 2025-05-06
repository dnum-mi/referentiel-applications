import type { HostingOption } from "@/models/Hosting";
import requests from "./xhr-client";

const HostingOptions = {
  async getAll(filters = {}): Promise<HostingOption[]> {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value as string);
    });

    const queryString = queryParams.toString();
    const url = queryString ? `/hosting-options?${queryString}` : "/hosting-options";
    return await requests.get(url);
  },

  async getById(id: string): Promise<HostingOption> {
    return await requests.get(`/hosting-options/${id}`);
  },

  async getSites(): Promise<string[]> {
    return await requests.get("/hosting-options/sites");
  },

  async getPlatforms(): Promise<string[]> {
    return await requests.get("/hosting-options/platforms");
  },

  async getProviders(): Promise<string[]> {
    return await requests.get("/hosting-options/providers");
  },

  async create(hostingOption: Partial<HostingOption>): Promise<HostingOption> {
    return await requests.post("/hosting-options", hostingOption);
  },

  async update(id: string, hostingOption: Partial<HostingOption>): Promise<HostingOption> {
    return await requests.patch(`/hosting-options/${id}`, hostingOption);
  },

  async delete(id: string): Promise<void> {
    return await requests.del(`/hosting-options/${id}`);
  },
};

export default HostingOptions;
