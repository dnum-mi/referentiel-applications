// src/api/sites.ts
import requests from "./xhr-client";

const Sites = {
  async getApplications(site: string): Promise<any[]> {
    return await requests.get(`/sites/${site}/applications`);
  },
};

export default Sites;
