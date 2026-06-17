import { test as base } from "@playwright/test";
import { test, expect } from "../fixtures/test";
import { ChromePage, HomePage, loginAs } from "../pom";
import { captureStepScreenshot } from "../support/screenshots";

/**
 * Non-régression — Accueil & chrome global (protocole `qa/protocoles/accueil.md`).
 * POM strict : `HomePage` / `ChromePage`. Les cas publics utilisent une session vierge ; les cas
 * connectés la fixture `data` (admin) ou `loginAs`.
 */
test.describe("Accueil & chrome", () => {
  // --- Cas publics (sans session) ---
  base.describe("public", () => {
    base.use({ storageState: { cookies: [], origins: [] } });
    base.afterEach(async ({ page }, testInfo) => {
      await captureStepScreenshot(page, testInfo);
    });

    base(
      "ACC-01 - la page d'accueil publique s'affiche sans authentification",
      async ({ page }) => {
        await new HomePage(page).openExpectingPublicAccess();
      },
    );

    base(
      "ACC-02 - la section Objectifs affiche ses 5 tuiles",
      async ({ page }) => {
        const home = new HomePage(page);
        await home.open();
        await home.expectObjectivesWithAllTiles();
      },
    );

    base("ACC-03 - le lien de contact pointe vers Tchap", async ({ page }) => {
      const home = new HomePage(page);
      await home.open();
      await home.expectBetaSectionVisible();
      expect(await home.contactLinkHref()).toContain("tchap.gouv.fr");
    });

    base(
      "ACC-04 - header public : seul « Se connecter » est proposé",
      async ({ page }) => {
        const chrome = new ChromePage(page);
        await chrome.open();
        await chrome.expectSignInLink();
        await chrome.expectNoProfileLink();
        await chrome.expectNoLogoutLink();
        await chrome.expectMainNavigationAbsent();
      },
    );

    base(
      "ACC-08 - la recherche rapide est absente en public",
      async ({ page }) => {
        const chrome = new ChromePage(page);
        await chrome.open();
        await chrome.expectQuickSearchAbsent();
      },
    );
  });

  // --- Cas connectés ---
  test("ACC-05 - header connecté : navigation principale et profil/déconnexion", async ({
    page,
    data,
  }) => {
    void data;
    const chrome = new ChromePage(page);
    await chrome.open();
    await chrome.expectMainNavigationVisible();
    await chrome.expectNavItem("Applications");
    await chrome.expectNavItem("Qualité Générale");
    await chrome.expectProfileLink();
    await chrome.expectLogoutLink();
    await chrome.expectNoSignInLink();
  });

  test("ACC-06 - le raccourci « Admin » n'apparaît que pour un administrateur", async ({
    page,
    data,
    browser,
  }) => {
    void data;
    const adminChrome = new ChromePage(page);
    await adminChrome.open();
    await adminChrome.expectAdminLink();

    const context = await browser.newContext();
    try {
      const userPage = await context.newPage();
      await loginAs(userPage, "user");
      const userChrome = new ChromePage(userPage);
      await userChrome.open();
      await userChrome.expectNoAdminLink();
    } finally {
      await context.close();
    }
  });

  test("ACC-07 - recherche rapide : suggestion puis navigation vers la fiche", async ({
    page,
    data,
  }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const chrome = new ChromePage(page);
    await chrome.open();
    // Préfixe court d'un libellé réel → ramène des suggestions dans l'autocomplete du header.
    await chrome.quickSearchToFiche(app!.label.slice(0, 4));
  });
});
