import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const BASE_URL = "http://localhost:5173";
const KC_USER = "user";
const KC_PASS = "pass";

async function login(page) {
  await page.goto(`${BASE_URL}/`);
  await page
    .getByRole("banner")
    .getByRole("link", { name: /Se connecter|Sign in/i })
    .click();

  // Page d'auth Keycloak
  await page.waitForURL(/\/realms\/.+\/protocol\/openid-connect\/auth/i, { timeout: 15_000 });

  await page.locator('#username, #kc-username, input[name="username"]').first().fill(KC_USER);
  await page.locator('#password, #kc-password, input[name="password"]').first().fill(KC_PASS);

  await Promise.all([
    page.waitForURL(new RegExp(`^${BASE_URL.replace(/\//g, "\\/")}`), { timeout: 20_000 }),
    page.locator('#kc-login, button[name="login"], input[type="submit"]').first().click(),
  ]);
}

function searchInput(page) {
  return page.getByRole("banner").locator('input[type="search"]');
}

test.describe("App.vue — Guest navigation", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test("should show main banner header", async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await expect(page.getByRole("banner")).toBeVisible();
  });

  test("should hide main navigation for guest", async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await expect(page.getByTestId("main-navigation")).toHaveCount(0);
  });

  test("should show Sign in link", async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await expect(page.getByRole("banner").getByRole("link", { name: /Se connecter|Sign in/i })).toBeVisible();
  });

  test("should hide header search input for guest", async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await expect(searchInput(page)).toHaveCount(0);
  });

  test("should show footer with links", async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    const footer = page.getByRole("contentinfo");
    await expect(footer).toBeVisible();

    const linkCount = await footer.getByRole("link").count();
    expect(linkCount).toBeGreaterThan(0);
  });
});

test.describe("App.vue — Authenticated navigation", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("should login shows main navigation", async ({ page }) => {
    await expect(page.getByTestId("main-navigation")).toBeVisible();
  });

  test("should profile link visible", async ({ page }) => {
    await expect(page.getByRole("banner").getByRole("link", { name: /Mon profil|Profile/i })).toBeVisible();
  });

  test("should logout link visible", async ({ page }) => {
    await expect(page.getByRole("banner").getByRole("link", { name: /Déconnexion|Logout/i })).toBeVisible();
  });

  test("should saves authenticated storageState to file", async ({ page, browserName }) => {
    const out = resolve(process.cwd(), "frontend/storage/auth.json");
    await page.context().storageState({ path: out });
    expect(existsSync(out), `storageState not created for ${browserName}`).toBeTruthy();
  });
});
