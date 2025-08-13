import { registerAs } from "@nestjs/config";

export default registerAs("app", () => ({
  env: process.env.NODE_ENV ?? "development",
  port: Number.parseInt(process.env.PORT ?? "3500", 10),
  host: process.env.HOST ?? "0.0.0.0",
}));
