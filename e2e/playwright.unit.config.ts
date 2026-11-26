import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./unit",
  // Ne pas effacer les traces d'une campagne navigateur exécutée en parallèle.
  outputDir: "test-results/unit",
  reporter: "list",
  forbidOnly: !!process.env.CI,
});
