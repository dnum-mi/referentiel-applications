import { expect, type Page } from "@playwright/test";

export const BASE_URL = "http://localhost:5173";
export const APPLICATION_SEARCH_PATH = "/recherche-application";
export const APPLICATION_SEARCH_TITLE_TEST_ID = "application-search-title";

export const keycloakData = {
  user: "user",
  pass: "pass",
};

const keycloakDataAdmin = {
  user: "admin",
  pass: "pass",
};

export async function login(page: Page, userData = keycloakDataAdmin) {
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

  await page.locator('#username, #kc-username, input[name="username"]').first().fill(userData.user);
  await page.locator('#password, #kc-password, input[name="password"]').first().fill(userData.pass);

  try {
    await Promise.all([
      page.waitForURL((url) => !url.toString().includes("/realms/") && !url.toString().includes("/oidc/callback"), { timeout: 30000 }),
      page.locator('#kc-login, button[name="login"], input[type="submit"]').first().click(),
    ]);
  } catch {
    // Firefox can occasionally remain on /oidc/callback; recover by reloading app root once.
    if (page.url().includes("/oidc/callback")) {
      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    } else {
      throw new Error(`Login redirection failed at URL: ${page.url()}`);
    }
  }

  if (page.url().includes("/oidc/callback")) {
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  }

  await profileOrLogoutLink.waitFor({ state: "visible", timeout: 15000 });
}

export function parseFirstNumber(text: string): number {
  const match = text.match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : 0;
}

export async function getSidebarTotalCount(page: Page, testId = "sidebar-total-count"): Promise<number> {
  const text = (await page.getByTestId(testId).innerText()).trim();
  return parseFirstNumber(text);
}

export async function waitForSearchParams(page: Page, predicate: (params: URLSearchParams) => boolean, timeout = 15000) {
  await expect.poll(() => predicate(new URL(page.url()).searchParams), { timeout }).toBeTruthy();
}

export async function gotoSearchPage(page: Page) {
  await login(page);
  await page.goto(`${BASE_URL}${APPLICATION_SEARCH_PATH}`);
  await expect(page.getByTestId(APPLICATION_SEARCH_TITLE_TEST_ID)).toBeVisible();
  await expect(page.getByTestId("application-table").or(page.getByTestId("application-card-view"))).toBeVisible();
}
