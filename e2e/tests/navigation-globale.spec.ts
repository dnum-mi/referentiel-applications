import { test as base, expect } from "@playwright/test";
import { test } from "../fixtures/test";
import {
  HomePage,
  SiteMapPage,
  AccessibilityPage,
  NotFoundPage,
  SearchPage,
  ReportsListPage,
} from "../pom";
import { loginAs } from "../pom/auth";
import { BASE_URL } from "../support/helpers";

test.describe("Navigation globale & pages statiques", () => {
  test("NAV-01 - charger la page d'accueil", async ({ page }) => {
    const home = new HomePage(page);
    await home.open();
    await home.expectTitle();
    await home.expectTiles();
    await home.expectContactLink();
  });

  test("NAV-04 - page plan du site", async ({ page }) => {
    const sitemap = new SiteMapPage(page);
    await sitemap.open();
    await sitemap.expectPublicPages();
    await sitemap.expectProtectedPages();
    await sitemap.expectLinks();
  });

  test("NAV-05 - page accessibilité", async ({ page }) => {
    const a11y = new AccessibilityPage(page);
    await a11y.open();
    await a11y.expectTitle();
  });

  test("NAV-06 - page 404 (route inconnue)", async ({ page }) => {
    const notFound = new NotFoundPage(page);
    await notFound.open();
    await notFound.expectErrorMessage();
    await notFound.expectHomeButton();
  });

  test("NAV-08 - navigation par onglets du bandeau", async ({ page }) => {
    const search = new SearchPage(page);
    await search.open();
    await search.expectListLoaded();

    const nav = page.getByTestId("main-navigation");
    await nav.getByRole("link", { name: /Signalements/i }).click();
    const reports = new ReportsListPage(page);
    await reports.expectTitle();

    await nav.getByRole("link", { name: /Qualité/i }).click();
    await expect(page.getByTestId("quality-page")).toBeVisible();
  });

  test("NAV-09 - page signalements dédiée", async ({ page }) => {
    const reports = new ReportsListPage(page);
    await reports.open();
    await reports.expectTitle();
    await reports.expectTabs();
    await reports.expectContentLoaded();
  });
});

base.describe("Navigation globale — non authentifié", () => {
  base.use({ storageState: { cookies: [], origins: [] } });

  base("NAV-02 - connexion Keycloak depuis la home", async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    const signIn = page
      .getByRole("banner")
      .getByRole("link", { name: /Se connecter|Sign in/i });
    await expect(signIn).toBeVisible({ timeout: 15000 });
    await signIn.click();
    await page.waitForURL(/\/realms\/.+\/protocol\/openid-connect\/auth/i);
    await page
      .locator('#username, input[name="username"]')
      .first()
      .fill("admin");
    await page
      .locator('#password, input[name="password"]')
      .first()
      .fill("pass");
    await page.locator('#kc-login, input[type="submit"]').first().click();
    await expect(
      page
        .getByRole("banner")
        .getByRole("link", { name: /Mon profil|Déconnexion/i })
        .first(),
    ).toBeVisible({ timeout: 15000 });
  });

  base("NAV-03 - déconnexion", async ({ page }) => {
    await loginAs(page, "admin");
    const profileLink = page
      .getByRole("banner")
      .getByRole("link", { name: /Mon profil|Déconnexion/i })
      .first();
    await expect(profileLink).toBeVisible({ timeout: 15000 });

    const logoutLink = page
      .getByRole("banner")
      .getByRole("link", { name: /Déconnexion|Logout/i });
    if (await logoutLink.isVisible().catch(() => false)) {
      await logoutLink.click();
    } else {
      await profileLink.click();
      const logoutBtn = page.getByRole("link", {
        name: /Déconnexion|Logout|Se déconnecter/i,
      });
      await expect(logoutBtn).toBeVisible({ timeout: 5000 });
      await logoutBtn.click();
    }

    await expect(
      page
        .getByRole("banner")
        .getByRole("link", { name: /Se connecter|Sign in/i }),
    ).toBeVisible({ timeout: 15000 });
  });

  base(
    "NAV-07 - accès non authentifié au catalogue redirige vers login",
    async ({ page }) => {
      await page.goto(`${BASE_URL}/recherche-application`);
      await page.waitForURL(/\/realms\/.+\/protocol\/openid-connect\/auth/i, {
        timeout: 15000,
      });
    },
  );
});
