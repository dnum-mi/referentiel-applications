import { registerAs } from "@nestjs/config";

export interface AppConfig {
  env: string
  port: number
  host: string
  onlyWriteSwagger: boolean
  writeYaml: boolean
  baseUrl: string
}
export default registerAs("app", (): AppConfig => {
  const env = process.env.NODE_ENV ?? "development";
  const port = Number.parseInt(process.env.PORT ?? "3500", 10);
  const host = process.env.HOST ?? "0.0.0.0";
  const onlyWriteSwagger = process.env.ONLY_WRITE_SWAGGER === "true";
  const writeYaml = process.env.WRITE_SWAGGER_YAML !== "false";
  const baseUrl = process.env.BASE_URL;
  if (!baseUrl) {
    throw new Error("BASE_URL is not defined");
  }

  return {
    env,
    port,
    host,
    onlyWriteSwagger,
    writeYaml,
    baseUrl,
  };
});
