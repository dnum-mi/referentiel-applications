import { test } from "../fixtures/test";
import {
  AdminPage,
  ApplicationPage,
  ChromePage,
  ReportsPage,
  loginAs,
} from "../pom";
// Miroir front des clés (import direct : garde-fou anti-dérive — si une clé du
// miroir n'existe pas côté backend, FLG-01 échoue au lieu de dériver en silence).
import { FeatureFlagKey } from "../../frontend/src/constants/feature-flags";

/**
 * Non-régression des feature flags (#2029). Les flags sont un état serveur
 * GLOBAL : la datafeature mémorise chaque bascule et la fixture `data` restaure
 * tout en teardown (y compris après un timeout). L'isolation temporelle est
 * structurelle : la suite vit dans le projet Playwright « feature-flags »
 * (voir playwright.config.ts), exécuté APRÈS tous les projets navigateurs pour
 * qu'aucune fenêtre « flag off » ne percute une suite parallèle.
 */
test.describe("Feature flags", () => {
  test("FLG-01 - l'admin voit chaque flag du catalogue partagé", async ({
    page,
    data,
  }) => {
    const flags = await data.featureFlags();
    test.skip(!flags?.length, "API feature-flags indisponible");

    const admin = new AdminPage(page);
    await admin.open();
    await admin.openFeatureFlagsTab();
    // Chaque clé du miroir front doit être listée par l'admin : une clé front
    // absente du catalogue backend fait échouer ce cas (anti-dérive).
    for (const key of Object.values(FeatureFlagKey)) {
      await admin.expectFeatureFlagListed(key);
    }
  });

  test("FLG-02 - désactiver un flag masque son onglet d'administration", async ({
    page,
    data,
  }) => {
    const state = await data.featureFlagState("api-tokens");
    test.skip(state === null, "Flag api-tokens absent du catalogue");
    // La bascule se fait via l'UI : on mémorise l'état pour que la fixture
    // restaure même si le test échoue entre le off et le re-on.
    await data.trackFeatureFlag("api-tokens");

    const admin = new AdminPage(page);
    await admin.open();
    await admin.expectAdminTabVisible(/gestion des tokens/i);

    await admin.openFeatureFlagsTab();
    await admin.setFeatureFlagViaUi("api-tokens", false);
    await admin.expectAdminTabHidden(/gestion des tokens/i);

    await admin.setFeatureFlagViaUi("api-tokens", true);
    await admin.expectAdminTabVisible(/gestion des tokens/i);
  });

  test("FLG-03 - désactiver un flag masque l'onglet correspondant de la fiche application", async ({
    page,
    data,
  }) => {
    const state = await data.featureFlagState("technology-stack");
    test.skip(state === null, "Flag technology-stack absent du catalogue");
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");
    if (!app) return;

    const appPage = new ApplicationPage(page);
    await appPage.open(app.id);
    await appPage.expectTabPresent("tab-technologies");

    await data.setFeatureFlag("technology-stack", false);
    await appPage.open(app.id); // full reload → GET /config renvoie le nouvel état
    await appPage.expectTabAbsent("tab-technologies");
    // Restauration : teardown de la fixture `data`.
  });

  test("FLG-04 - un flag désactivé redirige la route gouvernée vers l'accueil", async ({
    page,
    data,
  }) => {
    const state = await data.featureFlagState("reports");
    test.skip(state === null, "Flag reports absent du catalogue");

    const reports = new ReportsPage(page);
    await reports.open(); // la page répond quand le flag est actif

    await data.setFeatureFlag("reports", false);
    // Rechargement complet : le front recharge la config, la garde de route
    // (meta.requiresFeature) renvoie vers l'accueil.
    await reports.openExpectingRedirectToHome();
    // Restauration : teardown de la fixture `data`.
  });

  test("FLG-05 - l'onglet Feature flags est réservé à l'administrateur global", async ({
    browser,
    data,
  }) => {
    const ts = Date.now();
    const SCOPED_EMAIL = "scope-admin@example.com";
    let org: { id: string } | null = null;
    let original: { role: string; scopeOrganizationId: string | null } | null =
      null;

    // Contexte séparé : la session admin de la fixture reste intacte.
    const ctx = await browser.newContext();
    try {
      // Le login crée le compte en base s'il n'existe pas encore.
      const scopedPage = await ctx.newPage();
      await loginAs(scopedPage, "scope-admin");

      // L'admin global (fixture) promeut le compte en admin SCOPÉ sur une
      // organisation jetable, après avoir mémorisé son état pour restauration.
      original = await data.userScopeState(SCOPED_EMAIL);
      test.skip(!original, "Compte scope-admin introuvable");
      org = await data.createOrganization(`E2E/FLG05/${ts}`);
      test.skip(!org, "Impossible de créer l'organisation de test");
      await data.setUserScope(SCOPED_EMAIL, {
        role: "ADMIN",
        scopeOrganizationId: org!.id,
      });

      // L'admin scopé accède au panneau… mais pas au feature flipping
      // (le backend refuse de toute façon un compte scopé : 403).
      const admin = new AdminPage(scopedPage);
      await admin.open();
      await admin.expectAdminTabVisible(/gestion des utilisateurs/i);
      await admin.expectAdminTabHidden(/feature flags/i);
    } finally {
      if (original) {
        await data.setUserScope(SCOPED_EMAIL, original).catch(() => {});
      }
      if (org) await data.deleteOrganization(org.id).catch(() => {});
      await ctx.close();
    }
  });

  test("FLG-06 - une bascule se reflète dans la navigation sans rechargement", async ({
    page,
    data,
  }) => {
    const state = await data.featureFlagState("reports");
    test.skip(state === null, "Flag reports absent du catalogue");
    await data.trackFeatureFlag("reports");

    const admin = new AdminPage(page);
    const chrome = new ChromePage(page);
    await admin.open();
    await chrome.expectNavItem("Signalements");

    // La bascule depuis l'onglet admin met à jour le store local : la nav
    // réagit IMMÉDIATEMENT, sans rechargement de page.
    await admin.openFeatureFlagsTab();
    await admin.setFeatureFlagViaUi("reports", false);
    await chrome.expectNavItemAbsent("Signalements");

    await admin.setFeatureFlagViaUi("reports", true);
    await chrome.expectNavItem("Signalements");
  });
});
