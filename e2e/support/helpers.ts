import { expect, type Page } from "@playwright/test";

export const BASE_URL = "http://localhost:5173";

export interface Credentials {
  user: string;
  pass: string;
}

/**
 * Connexion via Keycloak (OIDC). Idempotente : ne refait rien si déjà connecté.
 * Repris du helper e2e historique du frontend, avec contournement du cas Firefox restant sur
 * `/oidc/callback`.
 */
export async function login(
  page: Page,
  credentials: Credentials,
): Promise<void> {
  const signInLink = page
    .getByRole("banner")
    .getByRole("link", { name: /Se connecter|Sign in/i });
  const profileOrLogoutLink = page
    .getByRole("banner")
    .getByRole("link", { name: /Mon profil|Profile|Déconnexion|Logout/i })
    .first();

  // Le SPA échoue parfois à monter son bandeau sous charge (config OIDC en course → page vide).
  // On recharge jusqu'à voir le header (l'un OU l'autre lien), plutôt que d'échouer.
  for (let attempt = 1; ; attempt += 1) {
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    try {
      await expect(signInLink.or(profileOrLogoutLink).first()).toBeVisible({
        timeout: 15000,
      });
      break;
    } catch (error) {
      if (attempt >= 3) throw error;
    }
  }
  if (await profileOrLogoutLink.isVisible().catch(() => false)) return;

  await signInLink.click();
  await page.waitForURL(/\/realms\/.+\/protocol\/openid-connect\/auth/i);

  await page
    .locator('#username, #kc-username, input[name="username"]')
    .first()
    .fill(credentials.user);
  await page
    .locator('#password, #kc-password, input[name="password"]')
    .first()
    .fill(credentials.pass);

  try {
    await Promise.all([
      page.waitForURL(
        (url) =>
          !url.toString().includes("/realms/") &&
          !url.toString().includes("/oidc/callback"),
        {
          timeout: 30000,
        },
      ),
      page
        .locator('#kc-login, button[name="login"], input[type="submit"]')
        .first()
        .click(),
    ]);
  } catch {
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

/**
 * Déconnecte en purgeant cookies + storage OIDC (évite le round-trip de logout Keycloak).
 * La prochaine `login()` redemandera les identifiants (session SSO effacée).
 */
export async function logout(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page
    .evaluate(() => {
      try {
        sessionStorage.clear();
        localStorage.clear();
      } catch {
        /* page hors origine app : sans effet */
      }
    })
    .catch(() => {});
}

export function parseFirstNumber(text: string): number {
  const match = text.match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : 0;
}

/** Attend que les search params de l'URL satisfassent le prédicat. */
export async function waitForSearchParams(
  page: Page,
  predicate: (params: URLSearchParams) => boolean,
  timeout = 15000,
): Promise<void> {
  await expect
    .poll(() => predicate(new URL(page.url()).searchParams), { timeout })
    .toBeTruthy();
}
