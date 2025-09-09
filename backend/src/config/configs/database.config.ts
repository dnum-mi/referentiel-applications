import { registerAs } from "@nestjs/config";

export default registerAs("database", () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not defined");
  }
  return {
    url,
  };
});
