import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const product = process.env.RGAA_PRODUCT_ROOT;
if (!product)
  throw new Error(
    "RGAA_PRODUCT_ROOT requis : Vite doit servir le checkout produit exact.",
  );

export default defineConfig({
  testDir: "./tests",
  testMatch: [
    "nvda-graphs.spec.ts",
    "nvda-ui.spec.ts",
    "nvda-forms.spec.ts",
    "nvda-suggestions.spec.ts",
    "nvda-remaining.spec.ts",
    "nvda-shared.spec.ts",
    "nvda-application.spec.ts",
  ],
  outputDir: "./test-results/interactive",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 300_000,
  forbidOnly: true,
  reporter: [
    ["list"],
    ["json", { outputFile: "evidence/interactive-results.json" }],
  ],
  use: {
    ...devices["Desktop Firefox"],
    browserName: "firefox",
    headless: false,
    locale: "fr-FR",
    serviceWorkers: "block",
    trace: "on",
    video: "on",
  },
  webServer: {
    command: `node "${fileURLToPath(new URL("./tools/serve-interactive.mjs", import.meta.url))}"`,
    cwd: path.join(product, "frontend"),
    url: "http://127.0.0.1:5173",
    reuseExistingServer: false,
    timeout: 120_000,
    env: { API_BASE_URL: "http://127.0.0.1:9", VITE_ENABLE_MATOMO: "false" },
  },
});
