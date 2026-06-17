import { test } from "../fixtures/test";
import { ApplicationPage, HistoryPage, MetadataDetailPage } from "../pom";

/**
 * Non-régression — Historique global & détail des modifications
 * (protocole `qa/protocoles/historique.md`). POM strict : `HistoryPage` / `MetadataDetailPage`.
 */
test.describe("Historique des modifications", () => {
  // La fixture `data` connecte `admin` : `/historique` requiert l'authentification.
  test("HIS-01 - la page Modifications se charge", async ({ page, data }) => {
    void data;
    const history = new HistoryPage(page);
    await history.open();
    await history.expectLoaded();
  });

  test("HIS-02 - la liste affiche au moins une modification", async ({
    page,
    data,
  }) => {
    test.skip(
      !(await data.anyMetadata()),
      "Aucune modification dans le journal",
    );

    const history = new HistoryPage(page);
    await history.open();
    await history.expectHasRows();
  });

  test("HIS-03 - filtre par dates futures vide la liste puis l'effacement la rétablit", async ({
    page,
    data,
  }) => {
    test.skip(
      !(await data.anyMetadata()),
      "Aucune modification dans le journal",
    );

    const history = new HistoryPage(page);
    await history.open();
    await history.expectHasRows();
    await history.filterFuturePeriodExpectEmpty();
    await history.clearFiltersExpectRows();
  });

  test("HIS-04 - « Voir plus » ouvre le détail d'une modification", async ({
    page,
    data,
  }) => {
    test.skip(
      !(await data.anyMetadata()),
      "Aucune modification dans le journal",
    );

    const history = new HistoryPage(page);
    await history.open();
    await history.openFirstDetail();
    await new MetadataDetailPage(page).expectDetailLoaded();
  });

  test("HIS-05 - le détail d'une modification (URL directe) affiche ses champs", async ({
    page,
    data,
  }) => {
    const meta = await data.anyMetadata();
    test.skip(!meta, "Aucune modification dans le journal");

    const detail = new MetadataDetailPage(page);
    await detail.open(meta!.id);
    await detail.expectDetailLoaded();
  });

  test("HIS-06 - le bouton « Retour à l'historique » revient à la liste", async ({
    page,
    data,
  }) => {
    test.skip(
      !(await data.anyMetadata()),
      "Aucune modification dans le journal",
    );

    const history = new HistoryPage(page);
    await history.open();
    await history.openFirstDetail();
    await new MetadataDetailPage(page).goBackToHistory();
  });

  test("HIS-07 - le détail renvoie vers la fiche application liée", async ({
    page,
    data,
  }) => {
    const meta = await data.anyMetadata();
    test.skip(!meta, "Aucune modification dans le journal");

    const detail = new MetadataDetailPage(page);
    await detail.open(meta!.id);
    await detail.expectDetailLoaded();
    test.skip(
      !(await detail.hasApplicationLink()),
      "La modification n'est pas rattachée à une application",
    );
    await detail.openApplicationFromLink();
  });

  test("HIS-08 - le détail d'un identifiant inexistant affiche une erreur", async ({
    page,
    data,
  }) => {
    void data;
    const detail = new MetadataDetailPage(page);
    await detail.open("00000000-0000-0000-0000-000000000000");
    await detail.expectNotFoundOrError();
  });

  test("HIS-09 - le tri par colonne recharge la liste", async ({
    page,
    data,
  }) => {
    test.skip(
      !(await data.anyMetadata()),
      "Aucune modification dans le journal",
    );

    const history = new HistoryPage(page);
    await history.open();
    await history.expectHasRows();
    await history.sortByColumnExpectReloaded("Application");
  });

  test("HIS-10 - « Voir plus » depuis l'onglet Modifications d'une fiche ouvre le détail", async ({
    page,
    data,
  }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-modifications");
    await fiche.expectModificationsTabLoaded();
    test.skip(
      (await fiche.modificationsSeeMoreCount()) === 0,
      "Cette application n'a aucune modification",
    );
    await fiche.openFirstModificationDetail();
    await new MetadataDetailPage(page).expectDetailLoaded();
  });
});
