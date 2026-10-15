import { defineConfig } from "@playwright/test";
import baseConfig from "./playwright.config";

/** Parcours RGAA sans nettoyage ni provisionnement de données métier. */
export default defineConfig({
  ...baseConfig,
  testMatch: "rgaa.spec.ts",
  globalSetup: undefined,
  workers: 1,
  reporter: "list",
});
