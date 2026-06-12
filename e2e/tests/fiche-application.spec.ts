import { test } from "../fixtures/test";
import { ApplicationPage } from "../pom";

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
});
