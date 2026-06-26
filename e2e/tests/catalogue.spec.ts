import { test as base } from "@playwright/test";
import { test, expect } from "../fixtures/test";
import { ApplicationPage, SearchPage } from "../pom";
import { captureStepScreenshot } from "../support/screenshots";

/**
 * Non-régression — Catalogue & recherche (protocole `qa/protocoles/catalogue.md`).
 * POM strict : aucune spec ne manipule de sélecteur, tout passe par `SearchPage` / `ApplicationPage`.
 */
test.describe("Catalogue & recherche", () => {
  // CAT-01 n'utilise pas la datafeature (pas de session) → test de base, storage vierge.
  base.describe("CAT-01", () => {
    base.use({ storageState: { cookies: [], origins: [] } });
    base.afterEach(async ({ page }, testInfo) => {
      await captureStepScreenshot(page, testInfo);
    });

    base(
      "CAT-01 - redirige vers la connexion si non authentifié",
      async ({ page }) => {
        await new SearchPage(page).gotoExpectingLogin();
      },
    );
  });

  test("CAT-02 - affiche la liste et l'IQ moyen", async ({ page, data }) => {
    test.skip(
      !(await data.firstApplication()),
      "Aucune application dans le jeu de données",
    );

    const search = new SearchPage(page);
    await search.open();
    await search.expectListLoaded();
    await search.expectAverageIqVisible();
  });

  test("CAT-03 - recherche par nom met à jour URL et compteur", async ({
    page,
    data,
  }) => {
    test.skip(
      !(await data.firstApplication()),
      "Aucune application dans le jeu de données",
    );

    const search = new SearchPage(page);
    await search.open();
    await search.expectListLoaded();
    const initial = await search.totalCount();

    const label = await search.firstRowLabel();
    await search.searchByLabel(label);
    await search.expectSearchApplied(label);

    const filtered = await search.totalCount();
    expect(filtered).toBeGreaterThan(0);
    expect(filtered).toBeLessThanOrEqual(initial);
  });

  test("CAT-07 - réinitialisation des filtres nettoie l'URL", async ({
    page,
    data,
  }) => {
    test.skip(
      !(await data.firstApplication()),
      "Aucune application dans le jeu de données",
    );

    const search = new SearchPage(page);
    await search.open();
    await search.expectListLoaded(); // total chargé (> 0) avant de mémoriser l'initial
    const initial = await search.totalCount();

    await search.searchByLabel("will-reset");
    await search.expectSearchApplied("will-reset"); // la recherche est appliquée avant le reset
    await search.resetFilters();
    await expect.poll(() => search.totalCount()).toBe(initial);
  });

  test("CAT-08 - tri par colonne met à jour l'URL", async ({ page, data }) => {
    test.skip(
      !(await data.firstApplication()),
      "Aucune application dans le jeu de données",
    );

    const search = new SearchPage(page);
    await search.open();

    await search.sortByName();
    const firstOrder = search.currentSortOrder();
    await search.sortByName();
    await search.expectSortOrderChangedFrom(firstOrder);

    await search.sortByIq();
  });

  test("CAT-09 - pagination met à jour l'URL", async ({ page, data }) => {
    test.skip(
      !(await data.firstApplication()),
      "Aucune application dans le jeu de données",
    );

    const search = new SearchPage(page);
    await search.open();
    await search.expectListLoaded();
    test.skip(
      (await search.totalCount()) <= 5,
      "Pas assez de données pour la pagination",
    );

    await search.setPageSize("5");
    await search.goToNextPage();
    await search.goToPrevPage();
  });

  test("CAT-10 - bascule « Mes applications »", async ({ page, data }) => {
    test.skip(
      !(await data.firstApplication()),
      "Aucune application dans le jeu de données",
    );

    const search = new SearchPage(page);
    await search.open();
    await search.toggleMyAppsAndExpectApplied();
    await search.expectResultsVisible();
  });

  test("CAT-13 - navigation vers la fiche application", async ({
    page,
    data,
  }) => {
    test.skip(
      !(await data.firstApplication()),
      "Aucune application dans le jeu de données",
    );

    const search = new SearchPage(page);
    await search.open();
    await search.openFirstApplication();
    await new ApplicationPage(page).expectLoaded();
  });

  test("CAT-04 - filtre par statut reflété dans l'URL", async ({
    page,
    data,
  }) => {
    test.skip(
      !(await data.firstApplication()),
      "Aucune application dans le jeu de données",
    );

    const search = new SearchPage(page);
    await search.open();
    await search.filterByStatus("to_validate");
    search.expectParamsPresent("currentStatus__in");
  });

  test("CAT-05 - filtre par organisation reflété dans l'URL", async ({
    page,
    data,
  }) => {
    test.skip(
      !(await data.firstApplication()),
      "Aucune application dans le jeu de données",
    );

    const search = new SearchPage(page);
    await search.open();
    await search.filterByOrganization("Minist");
    search.expectParamsPresent("organization");
  });

  test("CAT-06 - combinaison de plusieurs filtres dans l'URL", async ({
    page,
    data,
  }) => {
    test.skip(
      !(await data.firstApplication()),
      "Aucune application dans le jeu de données",
    );

    const search = new SearchPage(page);
    await search.open();
    await search.filterByStatus("to_validate");
    await search.filterByOrganization("Minist");
    await search.searchByLabel("combo");
    await search.expectSearchApplied("combo");
    search.expectParamsPresent("currentStatus__in", "organization", "search");
  });

  test("CAT-11 - vue tableau (desktop) / cartes (mobile)", async ({
    page,
    data,
  }) => {
    test.skip(
      !(await data.firstApplication()),
      "Aucune application dans le jeu de données",
    );

    const search = new SearchPage(page);
    await search.open();
    await search.expectTableViewOnDesktop();
    await search.expectCardViewOnMobile();
  });

  test("CAT-12 - persistance des filtres après rechargement", async ({
    page,
    data,
  }) => {
    test.skip(
      !(await data.firstApplication()),
      "Aucune application dans le jeu de données",
    );

    const search = new SearchPage(page);
    await search.open();
    await search.filterByStatus("to_validate");
    await search.searchByLabel("persist-cat12");
    await search.expectSearchApplied("persist-cat12");

    await search.reload();
    await search.expectSearchApplied("persist-cat12");
    search.expectParamsPresent("currentStatus__in");
  });

  test("CAT-14 - état vide (recherche sans résultat)", async ({
    page,
    data,
  }) => {
    test.skip(
      !(await data.firstApplication()),
      "Aucune application dans le jeu de données",
    );

    const search = new SearchPage(page);
    await search.open();
    await search.searchByLabel("zzz-aucune-appli-ne-matche-ce-terme-cat14");
    await search.expectEmptyState();
  });

  test("CAT-15 - export Excel (admin)", async ({ page, data }) => {
    test.skip(
      !(await data.firstApplication()),
      "Aucune application dans le jeu de données",
    );

    const search = new SearchPage(page);
    await search.open();
    const download = await search.exportExcel();
    expect(download.suggestedFilename()).toMatch(/\.(xlsx|xls)$/i);
  });

  test("CAT-16 - bascule « Mes abonnements »", async ({ page, data }) => {
    test.skip(
      !(await data.firstApplication()),
      "Aucune application dans le jeu de données",
    );

    const search = new SearchPage(page);
    await search.open();
    await search.toggleSubscribedAppsAndExpectApplied();
    await search.expectResultsVisible();
  });

  test("CAT-17 - colonnes avancées (MOA/MOE/Plateforme/Fournisseur)", async ({
    page,
    data,
  }) => {
    test.skip(
      !(await data.firstApplication()),
      "Aucune application dans le jeu de données",
    );

    const search = new SearchPage(page);
    await search.open();
    await search.openColumnCustomization();

    for (const label of ["MOA", "MOE", "Plateforme", "Fournisseur"]) {
      await search.expectColumnOptionAvailable(label);
      await search.enableColumn(label);
    }
    await search.closeColumnCustomization();

    for (const header of ["MOA", "MOE", "Plateforme", "Fournisseur"]) {
      await search.expectColumnVisible(header);
    }
  });

  test("CAT-18 - tri colonne Hébergement", async ({ page, data }) => {
    test.skip(
      !(await data.firstApplication()),
      "Aucune application dans le jeu de données",
    );

    const search = new SearchPage(page);
    await search.open();
    await search.expectColumnVisible("Hébergement");

    await search.sortByColumn("Hébergement", "hostingDisplay");
    const firstOrder = search.currentSortOrder();
    await search.sortByColumn("Hébergement", "hostingDisplay");
    await search.expectSortOrderChangedFrom(firstOrder);
  });

  test("CAT-19 - tri colonnes avancées (Direction métier, Statut)", async ({
    page,
    data,
  }) => {
    test.skip(
      !(await data.firstApplication()),
      "Aucune application dans le jeu de données",
    );

    const search = new SearchPage(page);
    await search.open();

    await search.openColumnCustomization();
    await search.enableColumn("Direction métier");
    await search.enableColumn("Statut");
    await search.closeColumnCustomization();

    await search.sortByColumn("Direction métier", "businessDivision");
    await search.sortByColumn("Statut", "status");
  });

  test("CAT-20 - tri colonnes conformité (DIMA, Homologation)", async ({
    page,
    data,
  }) => {
    test.skip(
      !(await data.firstApplication()),
      "Aucune application dans le jeu de données",
    );

    const search = new SearchPage(page);
    await search.open();

    await search.openColumnCustomization();
    await search.enableColumn("DIMA");
    await search.enableColumn("Homologation");
    await search.closeColumnCustomization();

    await search.sortByColumn("DIMA", "dima");
    await search.sortByColumn("Homologation", "homologation");
  });
});
