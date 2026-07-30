import { test as base } from "@playwright/test";
import { test } from "../fixtures/test";
import { AccessibilityPage, NotFoundPage, SiteMapPage } from "../pom";
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
});
