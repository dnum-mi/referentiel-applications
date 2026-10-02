import { isApiSuccess } from "@/api/api-result";
import type { ConfigDto } from "@/client";
import api from "@/api";

let config: ConfigDto | Error;

export async function getConfig() {
  if (!config) {
    const response = await api.getConfig();
    if (!response.data || !isApiSuccess(response)) {
      config = new Error("Failed to fetch configuration");
    } else {
      config = response.data;
    }
  }
  return config;
}
