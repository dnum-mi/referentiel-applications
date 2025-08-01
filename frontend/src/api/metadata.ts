import type { FirstAndLastMetadata, Metadata } from "@/models/Application";
import axios from "axios";

const Metadatas = {
  async getFirstAndLastByApplicationId(applicationId: string): Promise<FirstAndLastMetadata> {
    const { data } = await axios.get<FirstAndLastMetadata>(`applications/${applicationId}/metadatas/first-last`);
    return data;
  },
  async findByApplicationId(applicationId: string): Promise<Metadata[]> {
    const { data } = await axios.get<Metadata[]>(`applications/${applicationId}/metadatas`);
    return data;
  },
};

export default Metadatas;
