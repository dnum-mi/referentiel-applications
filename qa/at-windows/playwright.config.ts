import { defineConfig, devices } from "@playwright/test";
const phase = process.env.RGAA_PHASE === "smoke" ? "smoke" : "cases";
export default defineConfig({
  testDir: "./tests",
  testMatch: ["nvda-smoke.spec.ts", "nvda-cases.spec.ts"],
  outputDir: `./test-results/${phase}`,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  forbidOnly: true,
  reporter: [
    ["list"],
    ["json", { outputFile: `evidence/${phase}-results.json` }],
  ],
  use: {
    ...devices["Desktop Firefox"],
    headless: false,
    locale: "fr-FR",
    trace: "on",
    video: "on",
  },
  projects: [{ name: "nvda-firefox-fr", use: { browserName: "firefox" } }],
});
