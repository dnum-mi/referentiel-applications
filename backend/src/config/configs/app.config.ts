import type { APP_PERMISSIONS } from "src/common/utils/types";
import { registerAs } from "@nestjs/config";
import { AppPermissionsRecord } from "src/common/utils/types";

export interface FooterLink {
  label: string
  title: string
  href: string
}

export interface AppConfig {
  env: string
  port: number
  host: string
  onlyWriteSwagger: boolean
  writeYaml: boolean
  version: string
  footerLinks: FooterLink[]
  nonActorPermissions: APP_PERMISSIONS[]
}
export default registerAs("app", (): AppConfig => {
  const env = process.env.NODE_ENV ?? "development";
  const port = Number.parseInt(process.env.PORT ?? "3500", 10);
  const host = process.env.HOST ?? "0.0.0.0";
  const onlyWriteSwagger = process.env.ONLY_WRITE_SWAGGER === "true";
  const writeYaml = process.env.WRITE_SWAGGER_YAML !== "false";
  const version = process.env.VERSION ?? "development";
  let footerLinks: FooterLink[] = [];
  try {
    footerLinks = JSON.parse(process.env.FOOTER_LINKS ?? "[]");
  } catch {
    footerLinks = [];
  }
  const nonActorPermissions = (process.env.NON_ACTOR_PERMISSIONS ?? "")
    .split(",")
    .filter(perm => (perm in AppPermissionsRecord)) as APP_PERMISSIONS[];

  return {
    env,
    port,
    host,
    onlyWriteSwagger,
    writeYaml,
    version,
    footerLinks,
    nonActorPermissions,
  };
});
