import { registerAs } from "@nestjs/config";

export default registerAs("database", () => ({
  url: process.env.DATABASE_URL ?? "postgresql://postgres:password@localhost:5432/postgres",
}));
