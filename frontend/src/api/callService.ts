import requests from "./xhr-client";
import { apiConfig } from "./config";
import type { ModelName, ActionName } from "./types";

export async function call<M extends ModelName, A extends ActionName<M>>(
  model: M,
  action: A,
  variables: Record<string, any> = {},
): Promise<any> {
  const actionConfig = apiConfig[model][action];
  let url = actionConfig.url;
  const method = actionConfig.method.toLowerCase();
  const payloadKeys = (actionConfig.payload ?? []) as string[];

  url = url.replace(/:([a-zA-Z0-9_]+)/g, (_: string, key: string) => {
    const val = variables[key];
    if (val === undefined) throw new Error(`Missing variable '${key}'`);
    return val;
  });

  const payload = payloadKeys.reduce((acc: any, key: string) => {
    if (variables[key] !== undefined) acc[key] = variables[key];
    return acc;
  }, {});

  switch (method) {
    case "get":
      return await requests.get(url, payload);
    case "post":
      return await requests.post(url, payload);
    case "patch":
      return await requests.patch(url, payload);
    case "put":
      return await requests.put(url, payload);
    case "delete":
      return await requests.del(url, payload);
    default:
      throw new Error(`Unsupported method "${method}"`);
  }
}
