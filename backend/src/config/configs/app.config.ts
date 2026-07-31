import type { APP_PERMISSIONS } from "src/common/utils/types";
import { registerAs } from "@nestjs/config";
import { AppPermissionsRecord } from "src/common/utils/types";
import type { FooterLink } from "../domain/configs.entity";

export interface AppConfig {
  env: string;
  environmentLabel?: string;
  port: number;
  host: string;
  swaggerPublicUrl?: string;
  onlyWriteSwagger: boolean;
  writeYaml: boolean;
  version: string;
  footerLinks: FooterLink[];
  nonActorPermissions: APP_PERMISSIONS[];
  maintenanceMode: boolean;
  maintenanceCacheTtlMs: number;
}
export default registerAs("app", (): AppConfig => {
  let footerLinks: FooterLink[] = [];
  try {
    footerLinks = JSON.parse(process.env.FOOTER_LINKS ?? "[]");
  } catch {
    footerLinks = [];
  }
  const nonActorPermissions = (process.env.NON_ACTOR_PERMISSIONS ?? "")
    .split(",")
    .filter((perm) => perm in AppPermissionsRecord) as APP_PERMISSIONS[];
  const configuredMaintenanceCacheTtl = Number.parseInt(
    process.env.MAINTENANCE_CACHE_TTL_MS ?? "",
    10,
  );

  return {
    env: process.env.NODE_ENV ?? "development",
    port: Number.parseInt(process.env.PORT ?? "3500", 10),
    host: process.env.HOST ?? "0.0.0.0",
    swaggerPublicUrl: process.env.SWAGGER_PUBLIC_URL,
    onlyWriteSwagger: process.env.ONLY_WRITE_SWAGGER === "true",
    writeYaml: process.env.WRITE_SWAGGER_YAML !== "false",
    version: process.env.VERSION ?? "development",
    environmentLabel: process.env.ENV_LABEL,
    footerLinks,
    nonActorPermissions,
    maintenanceMode: ["1", "true", "yes"].includes(
      (process.env.MAINTENANCE_MODE ?? "").toLowerCase(),
    ),
    maintenanceCacheTtlMs:
      Number.isFinite(configuredMaintenanceCacheTtl) &&
      configuredMaintenanceCacheTtl > 0
        ? configuredMaintenanceCacheTtl
        : 30_000,
  };
});
