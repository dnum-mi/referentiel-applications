import type { Prisma } from "@prisma/client";

export type GLOBAL_PERMISSIONS = "read" | "write" | "admin";
export type GLOBAL_PERMS_MAP = Record<GLOBAL_PERMISSIONS, boolean>;
export type APP_PERMISSIONS = Exclude<
  keyof typeof Prisma.AppPermissionsScalarFieldEnum,
  "actorTypeId"
>;
export type APP_PERMS_MAP = Set<APP_PERMISSIONS>;

// uniquement utile pour faire matcher le typage avec une vraie valeur pour les class nest
export const AppPermissionsRecord = {
  readBase: null,
  writeCompliances: null,
  readRelations: null,
  writeRelations: null,
  readActors: null,
  writeActors: null,
  readCompliances: null,
  writeBase: null,
  readHostings: null,
  writeHostings: null,
  readLinks: null,
  writeLinks: null,
  readMetadata: null,
  readReports: null,
  manageReports: null,
  postReports: null,
  writePriorityRestart: null,
} as const satisfies Record<APP_PERMISSIONS, null>;

export const AppPermissionsValues: APP_PERMISSIONS[] = Object.keys(
  AppPermissionsRecord,
) as APP_PERMISSIONS[];

export type MetadataConfig<T> = {
  userId: string;
  getColumn?: (entity: T) => string;
  entity: string;
  gender: string;
  fields?: Record<string, string>;
};
export type ServiceOptions<T> = {
  applicationId: string;
  triggerQualityUpdate?: boolean;
  metadata?: MetadataConfig<T>;
  include?: Record<string, boolean | object>;
};
