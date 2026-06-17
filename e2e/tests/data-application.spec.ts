import { test } from "../fixtures/test";
import { ApplicationPage, DataDetailPage } from "../pom";

/**
 * Non-régression — Détail d'une donnée applicative (protocole `qa/protocoles/data-application.md`).
 * POM strict : `DataDetailPage` + `ApplicationPage` (onglet Sources de données). Données résolues via
 * l'API (`applicationWithData`) ; `test.skip` si aucune application ne porte de donnée.
 */
test.describe("Détail d'une donnée applicative", () => {
  test("DAT-01 - le détail d'une donnée (URL directe) affiche ses champs", async ({
    page,
    data,
  }) => {
    const ref = await data.applicationWithData();
    test.skip(!ref, "Aucune application avec données");

    const detail = new DataDetailPage(page);
    await detail.open(ref!.appId, ref!.dataId);
    await detail.expectLoaded();
  });

  test("DAT-02 - depuis l'onglet Sources de données, ouvrir le détail d'une donnée", async ({
    page,
    data,
  }) => {
    const ref = await data.applicationWithData();
    test.skip(!ref, "Aucune application avec données");

    const fiche = new ApplicationPage(page);
    await fiche.open(ref!.appId, "tab-data");
    await fiche.expectDataSourcesTabLoaded();
    await fiche.openFirstDataDetail();
    await new DataDetailPage(page).expectLoaded();
  });

  test("DAT-03 - le détail d'un identifiant inexistant affiche « Donnée introuvable »", async ({
    page,
    data,
  }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const detail = new DataDetailPage(page);
    await detail.open(app!.id, "00000000-0000-0000-0000-000000000000");
    await detail.expectNotFound();
  });

  test("DAT-04 - le bouton « Retour à la liste » revient à la fiche application", async ({
    page,
    data,
  }) => {
    const ref = await data.applicationWithData();
    test.skip(!ref, "Aucune application avec données");

    const detail = new DataDetailPage(page);
    await detail.open(ref!.appId, ref!.dataId);
    await detail.expectLoaded();
    await detail.goBackToFiche(ref!.appId);
  });
});
