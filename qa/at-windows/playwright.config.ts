import { defineConfig, devices } from "@playwright/test";
const phase = process.env.RGAA_PHASE === "smoke" ? "smoke" : "cases";
const caseId = process.env.RGAA_CASE_ID;
if (caseId && !/^[a-z0-9-]+$/.test(caseId))
  throw new Error("RGAA_CASE_ID invalide.");
const evidencePhase = caseId ? `${phase}-${caseId}` : phase;
export default defineConfig({
  testDir: "./tests",
  testMatch: ["nvda-smoke.spec.ts", "nvda-cases.spec.ts"],
  outputDir: caseId
    ? `./test-results/${phase}/${caseId}`
    : `./test-results/${phase}`,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  forbidOnly: true,
  reporter: [
    ["list"],
    ["json", { outputFile: `evidence/${evidencePhase}-results.json` }],
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
