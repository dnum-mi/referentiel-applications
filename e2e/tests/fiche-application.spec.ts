import { test, expect } from "../fixtures/test";
import { ApplicationPage, SearchPage, loginAs } from "../pom";

const USER_EMAIL = "user@example.com";

/**
 * Non-régression — Fiche application (protocole `qa/protocoles/fiche-application.md`).
 * La datafeature résout une application réelle avant chaque test ; POM strict.
 */
test.describe("Fiche application", () => {
  test("FIC-01 - ouverture de la fiche (titre + tags)", async ({
    page,
    data,
  }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id);
    await fiche.expectHeader();
  });

  test("FIC-03 - onglet Acteurs", async ({ page, data }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-actors");
    await fiche.expectActorsTabLoaded();
  });

  test("FIC-04 - onglet Statuts / cycle de vie", async ({ page, data }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-statuses");
    await fiche.expectStatusesTabLoaded();
  });

  test("FIC-05 - onglet Conformités (6 axes)", async ({ page, data }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-compliances");
    await fiche.expectCompliancesTabLoaded();
  });

  test("FIC-07 - onglet Relations + navigation vers la cible", async ({
    page,
    data,
  }) => {
    const app = await data.applicationWithRelations();
    test.skip(!app, "Aucune application avec relation dans le jeu de données");

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-relations");
    await fiche.expectRelationsWithTarget();
  });

  test("FIC-08 - onglet Liens externes", async ({ page, data }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-links");
    await fiche.expectLinksTabLoaded();
  });

  test("FIC-10 - onglet Qualité (IQ détaillé)", async ({ page, data }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-quality");
    await fiche.expectQualityIndexVisible();
  });

  test("FIC-11 - navigation par onglet via l'URL", async ({ page, data }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-statuses");
    await fiche.openTab("tab-quality");
    await fiche.expectTabActive("tab-quality");
  });

  test("FIC-02 - onglet Informations générales", async ({ page, data }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-infos");
    await fiche.expectInfosTabLoaded();
  });

  test("FIC-06 - axe RGAA (section dédiée)", async ({ page, data }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-compliances");
    await fiche.expectRgaaSectionVisible();
  });

  test("FIC-09 - onglet Sources de données", async ({ page, data }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-data");
    await fiche.expectDataSourcesTabLoaded();
  });

  test("FIC-12 - copier le lien de la fiche", async ({ page, data }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id);
    await fiche.copyLinkAndExpectToast();
  });

  test("FIC-13 - onglet Signalements de l'application", async ({
    page,
    data,
  }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-reports");
    await fiche.expectReportsTabLoaded();
  });

  test("FIC-14 - onglet Modifications (historique)", async ({ page, data }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-modifications");
    await fiche.expectModificationsTabLoaded();
  });

  test("FIC-15 - onglet Informations générales : libellé « Maîtrise des coûts » (dette technique)", async ({
    page,
    data,
  }) => {
    const app = await data.applicationWithTechnicalDebt();
    test.skip(
      !app,
      "Impossible de garantir une application avec dette technique",
    );

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-infos");
    await fiche.expectCostContainmentLabel();
  });

  test("FIC-16 - onglet Informations générales : un score non noté affiche « Non notée »", async ({
    page,
    data,
  }) => {
    const app = await data.seedTechnicalDebtWithoutCost();
    test.skip(
      !app,
      "Impossible de garantir une application avec dette technique partielle",
    );

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-infos");
    await fiche.expectCostContainmentNotRated();
  });

  test("FIC-21 - clic sur un tag de la fiche → navigation filtrée sur le tag", async ({
    page,
    data,
  }) => {
    const result = await data.applicationWithTags();
    test.skip(
      !result,
      "Impossible de garantir une application avec au moins un tag",
    );

    const fiche = new ApplicationPage(page);
    await fiche.open(result!.app.id, "tab-infos");
    await fiche.clickInfoTag(result!.tagValue);

    const search = new SearchPage(page);
    await search.expectTagParamEquals(result!.tagValue);
  });

  test("FIC-17 - tri onglet Acteurs", async ({ page, data }) => {
    const app = await data.applicationWithActors();
    test.skip(!app, "Aucune application avec acteurs dans le jeu de données");

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-actors");
    await fiche.expectActorsTabLoaded();

    await fiche.sortActorColumn("Organisation");
    await fiche.sortActorColumn("Nom");
  });

  test("FIC-18 - tri onglet Relations", async ({ page, data }) => {
    const app = await data.applicationWithRelations();
    test.skip(!app, "Aucune application avec relation dans le jeu de données");

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-relations");
    await fiche.expectRelationsWithTarget();

    await fiche.sortTabColumn("relations-table", "Application Cible");
    await fiche.sortTabColumn("relations-table", "Relation");
  });

  test("FIC-19 - tri onglet Signalements", async ({ page, data }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-reports");
    await fiche.expectReportsTabLoaded();

    await fiche.sortTabColumn("reports-table", "Date");
    await fiche.sortTabColumn("reports-table", "Auteur");
  });

  test("FIC-20 - tri onglet Modifications (lazy server-side)", async ({
    page,
    data,
  }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-modifications");
    await fiche.expectModificationsTabLoaded();

    await fiche.sortModificationsColumn("Date");
    await fiche.sortModificationsColumn("Titre");
  });
  // FIC-22 (#2088) — l'onglet Technologies (ex-« Stack technique » #2083, ex-« Technologie » #2413) suit les droits, comme les autres onglets
  // (défait la « lecture pour tous » de #2027) : un Visiteur (aucun droit Technologie) ne
  // doit pas le voir ; un Lecteur le retrouve via la projection de rôle par application.
  // CONTEXTE navigateur séparé pour la session `user` ; rôle restauré en `finally`.
  test("FIC-22 - l'onglet Technologies est masqué pour un Visiteur", async ({
    browser,
    data,
  }) => {
    // Application jetable : `user` n'y est PAS acteur — ses droits ne peuvent venir ni de
    // la matrice ni du rôle projeté, seul le socle global s'applique (cas isolé du bug).
    const app = await data.createTestApplication(`E2E-FIC22-${Date.now()}`);

    await data.setUserRole(USER_EMAIL, "VISITOR");
    const ctx = await browser.newContext();
    try {
      const userPage = await ctx.newPage();
      await loginAs(userPage, "user");
      const fiche = new ApplicationPage(userPage);

      // Visiteur : la fiche se rend (témoin AppRead du socle) mais SANS l'onglet
      // Technologies — le bouton d'onglet n'est pas rendu du tout. Les workers parallèles
      // (PRM-04/05) peuvent restaurer le rôle Lecteur au même moment → re-poser le rôle
      // avant chaque tentative (pattern PRM-10).
      await expect(async () => {
        await data.setUserRole(USER_EMAIL, "VISITOR");
        await fiche.open(app.id);
        await fiche.expectTabButtonVisible("Informations générales");
        await fiche.expectTabButtonAbsent("Technologies");
      }).toPass({ timeout: 45000 });

      // Lecteur : l'onglet revient via la projection de rôle (READ_APP_PERMISSIONS).
      await expect(async () => {
        await data.resetUser(USER_EMAIL);
        await fiche.open(app.id);
        await fiche.expectTabButtonVisible("Technologies");
      }).toPass({ timeout: 45000 });
    } finally {
      await ctx.close();
      await data.removeApplication(app.id);
      await data.resetUser(USER_EMAIL);
    }
  });
});
