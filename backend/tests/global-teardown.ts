import { dropTestDatabase, getTestDatabaseUrl } from "./test-database.utils";

export default async function globalTeardown(): Promise<void> {
  const testDatabaseUrl = getTestDatabaseUrl(process.env.DATABASE_URL);
  console.log("🗑️ Dropping test database...");
  await dropTestDatabase(testDatabaseUrl);
}
