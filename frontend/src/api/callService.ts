import requests from "./xhr-client";
import { apiConfig } from "./config";
import type { ModelName, ActionName } from "./types";

export async function call<M extends ModelName, A extends ActionName<M> | undefined>(
  model: M,
  action: A,
  variables: Record<string, any> = {},
): Promise<any> {
  const configEntry = action ? apiConfig[model]?.[action] : apiConfig[model];

  if (!configEntry) {
    throw new Error(`API config not found for model "${model}"${action ? ` and action "${action}"` : ""}`);
  }

  const method = configEntry.method?.toLowerCase?.();
  const urlTemplate = configEntry.url;

  if (!method || !urlTemplate) {
    throw new Error(`Invalid API config for model "${model}"${action ? ` and action "${action}"` : ""}`);
  }

  // Remplacement des variables dynamiques dans l'URL (ex: :applicationId)
  const url = urlTemplate.replace(/:(\w+)/g, (_, key: string) => {
    const val = variables[key];
    if (val === undefined) throw new Error(`Missing variable '${key}' in URL`);
    return val;
  });

  const payloadKeys = configEntry.payload ?? [];
  const queryKeys = configEntry.query ?? [];

  const payload = Object.fromEntries(payloadKeys.filter(key => variables[key] !== undefined).map(key => [key, variables[key]]));

  const query = Object.fromEntries(queryKeys.filter(key => variables[key] !== undefined).map(key => [key, variables[key]]));

  switch (method) {
    case "get":
      return await requests.get(url, { params: query });
    case "post":
      return await requests.post(url, payload);
    case "patch":
      return await requests.patch(url, payload);
    case "put":
      return await requests.put(url, payload);
    case "delete":
      return await requests.del(url, payload);
    default:
      throw new Error(`Unsupported HTTP method "${method}"`);
  }
}
