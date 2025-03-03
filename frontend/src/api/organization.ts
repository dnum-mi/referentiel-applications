import type { Organization } from "../models/Organization";
import requests, { get } from "./xhr-client";

const Organizations = {
  async getOrganizations(): Promise<Organization[]> {
    return await get<Organization[]>("/organizations");
  },
};

export default Organizations;
