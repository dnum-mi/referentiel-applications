import type { Page } from "@playwright/test";

export const BASE_URL = "http://localhost:5173";
const keycloakData = {
  user: "user",
  pass: "pass",
};

export async function login(page: Page) {
  await page.goto(`${BASE_URL}/`);
  await page
    .getByRole("banner")
    .getByRole("link", { name: /Se connecter|Sign in/i })
    .click();

  await page.waitForURL(/\/realms\/.+\/protocol\/openid-connect\/auth/i, { timeout: 15_000 });

  await page.locator('#username, #kc-username, input[name="username"]').first().fill(keycloakData.user);
  await page.locator('#password, #kc-password, input[name="password"]').first().fill(keycloakData.pass);

  await Promise.all([
    page.waitForURL(new RegExp(`^${BASE_URL.replace(/\//g, "\\/")}`), { timeout: 20_000 }),
    page.locator('#kc-login, button[name="login"], input[type="submit"]').first().click(),
  ]);
}
