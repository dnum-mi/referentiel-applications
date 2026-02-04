import type { Page } from "@playwright/test";

export const BASE_URL = "http://localhost:5173";
const keycloakData = {
  user: "admin",
  pass: "pass",
};

export async function login(page: Page) {
  await page.goto(`${BASE_URL}/`);

  const signInLink = page.getByRole("banner").getByRole("link", { name: /Se connecter|Sign in/i });

  const profileOrLogoutLink = page
    .getByRole("banner")
    .getByRole("link", { name: /Mon profil|Profile|Déconnexion|Logout/i })
    .first();
  const isAlreadyLoggedIn = await profileOrLogoutLink.isVisible().catch(() => false);

  if (isAlreadyLoggedIn) {
    return;
  }

  await signInLink.click();
  await page.waitForURL(/\/realms\/.+\/protocol\/openid-connect\/auth/i);

  await page.locator('#username, #kc-username, input[name="username"]').first().fill(keycloakData.user);
  await page.locator('#password, #kc-password, input[name="password"]').first().fill(keycloakData.pass);

  await Promise.all([
    page.waitForURL((url) => !url.toString().includes("/realms/") && !url.toString().includes("/oidc/callback"), { timeout: 30000 }),
    page.locator('#kc-login, button[name="login"], input[type="submit"]').first().click(),
  ]);

  await profileOrLogoutLink.waitFor({ state: "visible", timeout: 15000 });
}
