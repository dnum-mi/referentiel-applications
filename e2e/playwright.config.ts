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
  // Nettoie les résidus de test (`E2E…`) avant chaque suite → rejouable à l'infini sans re-seed.
  globalSetup: "./support/global-cleanup.ts",
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
    // La suite feature-flags bascule un état SERVEUR global : elle est isolée
    // dans son propre projet, exécuté APRÈS tous les autres (dependencies),
    // pour qu'une fenêtre « flag off » n'entre jamais en collision avec les
    // suites qui consomment les fonctionnalités gouvernées.
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: "**/feature-flags.spec.ts",
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
      testIgnore: "**/feature-flags.spec.ts",
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      testIgnore: "**/feature-flags.spec.ts",
    },
    // Pas de `dependencies` : Playwright exécuterait les projets dépendants EN
    // ENTIER en ignorant --grep (la campagne QA filtrée jouerait tout).
    // L'ordre « navigateurs puis feature-flags » est garanti par le script
    // `test:e2e` (deux invocations séquentielles) pour le run complet.
    {
      name: "feature-flags",
      use: { ...devices["Desktop Chrome"] },
      testMatch: "**/feature-flags.spec.ts",
    },
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
