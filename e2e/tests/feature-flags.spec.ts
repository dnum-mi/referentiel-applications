import { expect, test } from "../fixtures/test";
import { AdminPage, ApplicationPage } from "../pom";

/**
 * Non-régression des feature flags (#2029). Les flags sont un état GLOBAL partagé : chaque cas qui
 * en bascule un le **restaure en `finally`** via l'API. On cible volontairement des flags dont la
 * fonctionnalité n'est couverte par aucun autre test e2e (`api-tokens` : pas d'onglet Tokens dans le
 * POM ; `technology-stack` : absent du type `AppTab`) pour éviter toute collision entre workers.
 */
test.describe("Feature flags", () => {
  test("FLG-01 - l'admin voit la liste des feature flags", async ({
    page,
    data,
  }) => {
    const flags = await data.featureFlags();
    test.skip(!flags?.length, "API feature-flags indisponible");

    const admin = new AdminPage(page);
    await admin.open();
    await admin.openFeatureFlagsTab();
    await admin.expectFeatureFlagListed("mdit-campaigns");
    await admin.expectFeatureFlagListed("technology-stack");
  });

  test("FLG-02 - désactiver un flag masque son onglet d'administration", async ({
    page,
    data,
  }) => {
    const state = await data.featureFlagState("api-tokens");
    test.skip(state === null, "Flag api-tokens absent du catalogue");

    const admin = new AdminPage(page);
    try {
      await admin.open();
      await admin.expectAdminTabVisible(/gestion des tokens/i);

      await admin.openFeatureFlagsTab();
      await admin.setFeatureFlagViaUi("api-tokens", false);
      await admin.expectAdminTabHidden(/gestion des tokens/i);

      await admin.setFeatureFlagViaUi("api-tokens", true);
      await admin.expectAdminTabVisible(/gestion des tokens/i);
    } finally {
      // État global : on rétablit systématiquement le flag, même si le test a échoué.
      await data.setFeatureFlag("api-tokens", true);
    }
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
    try {
      await appPage.open(app.id);
      await appPage.expectTabPresent("tab-technologies");

      await data.setFeatureFlag("technology-stack", false);
      await appPage.open(app.id); // full reload → GET /config renvoie le nouvel état
      await appPage.expectTabAbsent("tab-technologies");
    } finally {
      await data.setFeatureFlag("technology-stack", true);
    }
  });
});
