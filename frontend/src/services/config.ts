import { isApiSuccess } from "@/api/api-result";
import type { ConfigDto } from "@/client";
import api from "@/api";

let config: ConfigDto | Error;
let pendingConfig: Promise<ConfigDto | Error> | undefined;

export async function getConfig({ refresh = false } = {}) {
  if (pendingConfig) return pendingConfig;
  if (!config || refresh) {
    pendingConfig = (async () => {
      const response = await api.getConfig();
      config = !response.data || !isApiSuccess(response) ? new Error("Failed to fetch configuration") : response.data;
      return config;
    })();
    try {
      return await pendingConfig;
    } finally {
      pendingConfig = undefined;
    }
  }
  return config;
}
