import { defineConfig, devices } from "@playwright/test";

const outputDir = process.env.CI
  ? "test-results"
  : `test-results/local-${Date.now()}-${process.pid}`;

/**
 * Configuration e2e de non-régression.
 * Les specs vivent dans ce package racine `e2e/` (et non plus dans `frontend/`) car elles couvrent
 * l'ensemble du système (front + API + Keycloak). Le serveur de dev frontend est démarré
 * automatiquement via `webServer` (depuis `../frontend`).
 */
export default defineConfig({
  testDir: "./tests",
  outputDir,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:5173",
    headless: true,
    trace: "on-first-retry",
    video: "retain-on-failure",
    // Marges généreuses : un seul stack de dev encaisse une longue série séquentielle (login
    // Keycloak par test) → on absorbe les pics de latence pour éliminer le flaky de charge.
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
    colorScheme: "dark",
    timezoneId: "Europe/Paris",
  },
  expect: { timeout: 15_000 },
  timeout: 90_000,

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],

  /* Démarre le serveur de dev du frontend (réutilise une instance déjà lancée en local). */
  webServer: {
    command: "pnpm dev",
    cwd: "../frontend",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
