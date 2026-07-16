import { test as base } from "@playwright/test";
import { test, expect } from "../fixtures/test";
import { ChromePage, HomePage, SearchPage, loginAs } from "../pom";
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

    base(
      "ACC-09 - le footer affiche les liens obligatoires",
      async ({ page }) => {
        const chrome = new ChromePage(page);
        await chrome.open();
        await chrome.expectFooterVisible();
        await chrome.expectFooterLink(/Accessibilité/);
        await chrome.expectFooterLink(/Plan du site/);
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

  test("ACC-10 - un item de navigation principale ouvre sa page", async ({
    page,
    data,
  }) => {
    void data;
    const chrome = new ChromePage(page);
    await chrome.open();
    await chrome.clickNavItem("Applications", /\/recherche-application/);
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

  test("ACC-11 - recherche rapide : un préfixe court non lemmatisé ramène des suggestions", async ({
    page,
    data,
  }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const chrome = new ChromePage(page);
    await chrome.open();
    // Préfixe court d'un libellé réel : doit ramener ≥ 1 suggestion (garde la non-régression du
    // bug de racinisation française — l'index préfixe repose sur `document_simple`).
    await chrome.expectQuickSearchHasSuggestions(app!.label.slice(0, 4));
  });

  test("ACC-12 - recherche rapide indépendante des filtres de la page de recherche", async ({
    page,
    data,
  }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    // On filtre la page de recherche jusqu'à un état vide (0 résultat)…
    const search = new SearchPage(page);
    await search.open();
    await search.searchByLabel("zzqxwvkjno-aucune-correspondance");
    await search.expectEmptyState();

    // … la recherche rapide du bandeau reste alimentée (indépendante des filtres, triée par pertinence).
    const chrome = new ChromePage(page);
    await chrome.expectQuickSearchHasSuggestions(app!.label.slice(0, 4));
  });

  test("ACC-13 - recherche rapide : un terme sans correspondance affiche « Aucun résultat »", async ({
    page,
    data,
  }) => {
    void data;
    const chrome = new ChromePage(page);
    await chrome.open();
    await chrome.expectQuickSearchNoResult("zzqxwvkjno-aucune-correspondance");
  });

  test("ACC-14 - recherche rapide : navigation clavier dans l'autocomplete (RGAA 4.1.2)", async ({
    page,
    data,
  }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const chrome = new ChromePage(page);
    await chrome.open();
    await chrome.fillQuickSearch(app!.label.slice(0, 4));
    await chrome.expectQuickSearchExpanded();
    await chrome.quickSearchHighlightFirstOption(); // flèche bas → 1re option active
    await chrome.quickSearchEscapeCollapses(); // Échap → liste refermée
  });

  test("ACC-15 - recherche rapide : une app au nom ponctué est trouvable par son nom complet", async ({
    page,
    data,
  }) => {
    const app = await data.applicationWithPunctuationInLabel();
    test.skip(!app, "Aucune application au nom ponctué dans le jeu de données");

    const chrome = new ChromePage(page);
    await chrome.open();
    // Non-régression : taper le nom COMPLET (avec sa ponctuation interne, ex. « O'Kon »,
    // « QA-GROUP-CHILD ») doit bien remonter cette application précise.
    await chrome.expectQuickSearchSuggestion(app!.label, app!.label);
  });
});
