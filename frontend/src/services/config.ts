import api from "@/api";
import type { ConfigDto } from "@/client";

let config: ConfigDto | Error;

export async function getConfig() {
  if (!config) {
    const response = await api.getConfig();
    if (!response.data || !response.response.ok) {
      config = new Error("Failed to fetch configuration");
    } else {
      config = response.data;
    }
  }
  return config;
}
