import { test as base } from "@playwright/test";
import { test } from "../fixtures/test";
import {
  AccessibilityPage,
  EndOfLifePage,
  NotFoundPage,
  SiteMapPage,
} from "../pom";
import { captureStepScreenshot } from "../support/screenshots";

/**
 * Non-régression — Pages transverses (protocole `qa/protocoles/transverse.md`) :
 * plan du site, accessibilité, 404. POM strict. Cas publics en session vierge ; cas connectés via `data`.
 */
test.describe("Pages transverses", () => {
  // --- Cas publics (sans session) ---
  base.describe("public", () => {
    base.use({ storageState: { cookies: [], origins: [] } });
    base.afterEach(async ({ page }, testInfo) => {
      await captureStepScreenshot(page, testInfo);
    });

    base("TRV-01 - le plan du site se charge", async ({ page }) => {
      const sitemap = new SiteMapPage(page);
      await sitemap.open();
      await sitemap.expectLoaded();
    });

    base(
      "TRV-02 - un lien public du plan du site navigue vers sa page",
      async ({ page }) => {
        const sitemap = new SiteMapPage(page);
        await sitemap.open();
        await sitemap.clickPublicLink("Accessibilité", /\/accessibilite/);
      },
    );

    base("TRV-04 - la page Accessibilité se charge", async ({ page }) => {
      const accessibility = new AccessibilityPage(page);
      await accessibility.open();
      await accessibility.expectLoaded();
    });

    base(
      "TRV-05 - une route inconnue affiche la page « non trouvée »",
      async ({ page }) => {
        const notFound = new NotFoundPage(page);
        await notFound.openUnknownRoute();
        await notFound.expectNotFound();
      },
    );

    base(
      "TRV-07 - la page Accessibilité affiche ses sections",
      async ({ page }) => {
        const accessibility = new AccessibilityPage(page);
        await accessibility.open();
        await accessibility.expectSections();
        await accessibility.expectInitialAuditResults();
      },
    );
  });

  // --- Cas connectés ---
  test("TRV-03 - le plan du site connecté liste l'espace connecté", async ({
    page,
    data,
  }) => {
    void data;
    const sitemap = new SiteMapPage(page);
    await sitemap.open();
    await sitemap.expectProtectedSection();
  });

  test("TRV-06 - la page 404 ramène au catalogue (connecté)", async ({
    page,
    data,
  }) => {
    void data;
    const notFound = new NotFoundPage(page);
    await notFound.openUnknownRoute();
    await notFound.expectNotFound();
    await notFound.clickHomeAndExpectCatalogue();
  });

  test("TRV-08 - la page Fins de vie liste les applications concernées (#2236)", async ({
    page,
    data,
  }) => {
    void data;
    // `QA-EOL` porte trois technologies couvrant les trois statuts (seed QA).
    const endOfLife = new EndOfLifePage(page);
    await endOfLife.open();
    await endOfLife.expectLoaded();
    await endOfLife.expectResultsAnnounced();
    await endOfLife.expectApplicationListed("QA-EOL", "Fin de vie");

    // Les statuts PARTITIONNENT la liste : filtrer sur « fin de support actif »
    // ne doit pas ramener la technologie déjà en fin de vie, sans quoi les trois
    // filtres se chevaucheraient au lieu de découper la liste.
    await endOfLife.filterByStatus("eoas-passed");
    await endOfLife.expectApplicationListed("QA-EOL", "Fin de support actif");

    await endOfLife.filterByStatus("eol");
    await endOfLife.expectApplicationListed("QA-EOL", "Fin de vie");

    // Le trajet qui donne son intérêt à la vue : de la liste vers l'onglet Stack
    // technique de la fiche.
    await endOfLife.openApplicationTechnologyTab("QA-EOL");
  });
});
