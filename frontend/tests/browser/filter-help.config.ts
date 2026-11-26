import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig({
  ...base,
  testMatch: "filterHelp.spec.ts",
  retries: 0,
  use: { ...base.use, baseURL: "http://localhost:5188", launchOptions: {} },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined },
      },
    },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    ...base.webServer,
    command: "node node_modules/vite/bin/vite.js --config tests/browser/vite.config.ts --port 5188 --strictPort",
    url: "http://localhost:5188/tests/browser/fixtures/filterHelp.html",
  },
});
