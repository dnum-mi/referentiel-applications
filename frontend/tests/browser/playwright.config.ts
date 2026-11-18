import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:5174",
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    trace: "retain-on-failure",
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined },
  },
  webServer: {
    cwd: fileURLToPath(new URL("../..", import.meta.url)),
    command: "node node_modules/vite/bin/vite.js --config tests/browser/vite.config.ts",
    url: "http://localhost:5174/tests/browser/fixtures/metadata.html",
    reuseExistingServer: false,
  },
});
