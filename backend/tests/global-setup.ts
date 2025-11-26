import { execSync } from "node:child_process";
import { createTestDatabase, getTestDatabaseUrl } from "./test-database.utils";

export default async function globalSetup(): Promise<void> {
  const testDatabaseUrl = getTestDatabaseUrl(process.env.DATABASE_URL);

  console.log("🔧 Setting up test database...");
  await createTestDatabase(testDatabaseUrl);

  console.log("📦 Running Prisma migrations...");
  execSync("./node_modules/.bin/prisma migrate deploy", {
    env: { DATABASE_URL: testDatabaseUrl },
    stdio: "inherit",
  });

  console.log("🔨 Generating Prisma client...");
  execSync("./node_modules/.bin/prisma generate", {
    stdio: "inherit",
  });

  console.log("✅ Test database ready!");
}
