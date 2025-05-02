import requests from "./xhr-client";

const HostingLookups = {
  async getProviders() {
    return await requests.get("/providers");
  },

  async getHostingSites() {
    return await requests.get("/hosting-sites");
  },

  async getPlatforms() {
    return await requests.get("/platforms");
  },

  async getPlatformsByProvider(providerId: string) {
    return await requests.get(`/platforms?providerId=${providerId}`);
  },

  async getPlatformsByHostingSite(hostingSiteId: string) {
    return await requests.get(`/platforms?hostingSiteId=${hostingSiteId}`);
  },
};

export default HostingLookups;
