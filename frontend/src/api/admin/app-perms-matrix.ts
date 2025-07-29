import type { AppPermsMatrix } from "@/models/Application";
import requests from "../xhr-client";

const AppPermsMatrixApi = {
  async get(): Promise<AppPermsMatrix> {
    return requests.get(`actorTypes/perms-matrix`);
  },

  async update(matrix: AppPermsMatrix): Promise<AppPermsMatrix> {
    return requests.patch(`actorTypes/perms-matrix`, matrix);
  },
};

export default AppPermsMatrixApi;
