import type { apiConfig } from "./config";

export type ApiConfig = typeof apiConfig;

export type ModelName = keyof ApiConfig;
export type ActionName<M extends ModelName> = keyof ApiConfig[M];
export type PayloadKeys<M extends ModelName, A extends ActionName<M>> = ApiConfig[M][A] extends { payload: readonly string[] }
  ? ApiConfig[M][A]["payload"]
  : [];

export interface ApiAction<M extends ModelName, A extends ActionName<M>> {
  method: ApiConfig[M][A]["method"]
  url: ApiConfig[M][A]["url"]
  payload: PayloadKeys<M, A>
}
