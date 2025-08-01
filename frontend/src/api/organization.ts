import type { Organization } from "../models/organization";
import axios from "axios";

const Organizations = {
  async getOrganizations(ids?: string[]): Promise<Record<string, Organization>> {
    const { data } = await axios.get<Record<string, Organization>>(`organizations?withAncestors=true${ids ? `&ids=${ids.join(",")}` : ""}`);
    return data;
  },
  async searchOrganizations(search: string): Promise<Record<string, Organization>> {
    const { data } = await axios.get<Record<string, Organization>>(`organizations?withAncestors=true&search=${encodeURIComponent(search)}`);
    return data;
  },
  async create(organization: Omit<Organization, "id">): Promise<Organization> {
    const { data } = await axios.post<Organization>("organizations", organization);
    return data;
  },
  async patch(id: string, organization: Partial<Organization>): Promise<Organization> {
    const { data } = await axios.patch<Organization>(`organizations/${id}`, organization);
    return data;
  },
};

export default Organizations;
