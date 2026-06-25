import { registerAs } from "@nestjs/config";

export const emailConfig = registerAs("email", () => ({
  host: process.env.SMTP_HOST,
  port: Number.parseInt(process.env.SMTP_PORT, 10),
  secure: process.env.SMTP_SECURE === "true",
  from: process.env.SMTP_FROM,
  enabled:
    process.env.SMTP_ENABLED === "true" &&
    Boolean(process.env.SMTP_HOST) &&
    Boolean(process.env.SMTP_PORT),
}));
