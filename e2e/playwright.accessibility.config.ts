import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

/** Contrats d'accessibilité sur le vrai front, l'API et Keycloak, sans synthèse vocale. */
export default defineConfig({
  ...base,
  testMatch: "accessibility-*.spec.ts",
  globalSetup: "./support/accessibility-setup.ts",
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { ...base.use, trace: "retain-on-failure" },
});
