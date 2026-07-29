import { test, expect } from "../fixtures/test";
import { ApplicationPage, DataDetailPage } from "../pom";

/**
 * Non-régression — Détail d'une donnée applicative (protocole `qa/protocoles/data-application.md`).
 * POM strict : `DataDetailPage` + `ApplicationPage` (onglet Sources de données). Données résolues via
 * l'API (`applicationWithData`) ; `test.skip` si aucune application ne porte de donnée.
 *
 * DAT-06 à DAT-12 étendent la suite au CRUD du catalogue de données (rattachement, création inline,
 * édition, détachement) livré depuis l'onglet Données de la fiche et depuis la page de détail.
 * Résolveurs dédiés : `provisionUnattachedDataDescription` (description non rattachée, à rattacher
 * dans le test) et `provisionAttachedData` (description créée ET rattachée, jetable pour les cas qui
 * suppriment).
 *
 * DAT-13/DAT-14 couvrent les familles métier multiples (une donnée peut appartenir à plusieurs
 * familles) ; DAT-15/DAT-16 couvrent les applications sources (tags cliquables redirigeant vers la
 * fiche de l'application source), dans le tableau Données et dans la page de détail.
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

  test("DAT-05 - le détail affiche la section « Usage dans l'application »", async ({
    page,
    data,
  }) => {
    const ref = await data.applicationWithData();
    test.skip(!ref, "Aucune application avec données");

    const detail = new DataDetailPage(page);
    await detail.open(ref!.appId, ref!.dataId);
    await detail.expectUsageSection();
  });

  test("DAT-06 - trier la table Données d'une application (Nom, Famille métier)", async ({
    page,
    data,
  }) => {
    const ref = await data.applicationWithData();
    test.skip(!ref, "Aucune application avec données");

    const fiche = new ApplicationPage(page);
    await fiche.open(ref!.appId, "tab-data");
    await fiche.expectDataSourcesTabLoaded();

    await fiche.sortTabColumn("data-application-table", "Nom de la donnée");
    expect(await fiche.dataRowCount()).toBeGreaterThan(0);

    await fiche.sortTabColumn("data-application-table", "Famille métier");
    expect(await fiche.dataRowCount()).toBeGreaterThan(0);
  });

  test("DAT-07 - rattacher une donnée existante du catalogue depuis l'onglet Données", async ({
    page,
    data,
  }) => {
    // Application dédiée et jetable (pas `firstApplication()`/`applicationWithData()`) : évite
    // qu'une ligne transitoirement rattachée ici ne devienne, le temps du test, la « première »
    // donnée d'une application lue en parallèle par un cas concurrent (ex. DAT-09/DAT-11).
    const { applicationId, description } =
      await data.provisionUnattachedDataDescription();

    const fiche = new ApplicationPage(page);
    let dataApplicationId: string | null = null;
    try {
      await fiche.open(applicationId, "tab-data");
      await fiche.expectDataSourcesTabLoaded();
      await fiche.openAddDataModal();
      // Le nom généré par le résolveur (`E2E DAT <timestamp>`) est déjà unique : on l'utilise en
      // entier comme terme de recherche (≥ 3 caractères requis) pour limiter le risque que la
      // description créée sorte du top 20 résultats renvoyés par la recherche serveur.
      await fiche.searchAndSelectExistingData(description.name, description.id);
      dataApplicationId = await fiche.submitNewDataAttachment();
      await fiche.expectDataRowContains(description.name);
    } finally {
      if (dataApplicationId) {
        await data.detachDataFromApplication(applicationId, dataApplicationId);
      }
      await data.deleteDataDescription(description.id);
      await data.removeApplication(applicationId);
    }
  });

  test("DAT-08 - créer une nouvelle donnée de catalogue (famille inline + tag) et la rattacher", async ({
    page,
    data,
  }) => {
    const tag = await data.firstTag();
    test.skip(!tag, "Aucun tag dans le jeu de données");

    const ts = Date.now();
    const uniqueName = `E2E DAT-08 ${ts}`;
    const familyPath = `E2E DAT-08 Famille ${ts}`;

    // Application dédiée et jetable (cf. commentaire DAT-07) : évite qu'une ligne transitoirement
    // rattachée ici n'interfère avec `applicationWithData()` lu en parallèle par un cas concurrent.
    const app = await data.createTestApplication(`E2E DAT-08 App ${ts}`);

    const fiche = new ApplicationPage(page);
    let dataApplicationId: string | null = null;
    try {
      await fiche.open(app.id, "tab-data");
      await fiche.expectDataSourcesTabLoaded();
      await fiche.openAddDataModal();
      await fiche.switchToCreateNewDescription();
      await fiche.fillNewDescriptionName(uniqueName);
      await fiche.createNewFamilyInline(familyPath);
      await fiche.addNewDescriptionTag(tag!.name);
      dataApplicationId = await fiche.submitNewDataAttachment();
      await fiche.expectDataRowContainsAll(uniqueName, [familyPath]);
    } finally {
      // Le formulaire ne restitue pas les ids de la description et de la famille créées inline :
      // on les retrouve par leur nom unique (timestampé) pour les supprimer — sans quoi elles
      // s'accumulaient en base à chaque run (#2117).
      if (dataApplicationId) {
        await data.detachDataFromApplication(app.id, dataApplicationId);
      }
      await data.deleteDataDescriptionByName(uniqueName);
      await data.deleteDataFamilyByPath(familyPath);
      await data.removeApplication(app.id);
    }
  });

  test("DAT-09 - modifier la sensibilité d'une donnée rattachée depuis l'onglet Données", async ({
    page,
    data,
  }) => {
    const ref = await data.applicationWithData();
    test.skip(!ref, "Aucune application avec données");

    const fiche = new ApplicationPage(page);
    await fiche.open(ref!.appId, "tab-data");
    await fiche.expectDataSourcesTabLoaded();
    await fiche.openEditDataModal(ref!.dataId);
    await fiche.expectDataSearchLocked();

    const originalValue = await fiche.currentSensibilityValue();
    const chosen = await fiche.selectDifferentSensibility(originalValue);
    test.skip(
      !chosen,
      "Le référentiel n'expose aucune sensibilité alternative",
    );

    try {
      await fiche.submitDataEdit();
      await fiche.expectDataRowSensibility(ref!.dataId, chosen!.label);
    } finally {
      await fiche.setDataSensibility(ref!.dataId, originalValue);
    }
  });

  test("DAT-10 - détacher une donnée depuis l'onglet Données", async ({
    page,
    data,
  }) => {
    // Application dédiée et jetable (cf. commentaire DAT-07).
    const { applicationId, dataApplicationId, descriptionId } =
      await data.provisionAttachedData();

    const fiche = new ApplicationPage(page);
    try {
      await fiche.open(applicationId, "tab-data");
      await fiche.expectDataSourcesTabLoaded();
      await fiche.deleteDataRow(dataApplicationId);
      await fiche.expectDataRowAbsent(dataApplicationId);
      // Le détachement est le geste testé lui-même : pas de `detachDataFromApplication` ici.
    } finally {
      await data.deleteDataDescription(descriptionId); // sinon la description resterait orpheline (#2117)
      await data.removeApplication(applicationId);
    }
  });

  test("DAT-11 - modifier une donnée depuis la page de détail (statut open data)", async ({
    page,
    data,
  }) => {
    const ref = await data.applicationWithData();
    test.skip(!ref, "Aucune application avec données");

    const detail = new DataDetailPage(page);
    await detail.open(ref!.appId, ref!.dataId);
    await detail.expectLoaded();
    await detail.openEdit();
    const originalValue = await detail.currentOpenDataStatusValue();
    const chosen = await detail.selectDifferentOpenDataStatus();

    try {
      await detail.submitEdit();
      await detail.expectUsageOpenDataStatus(chosen.label);
    } finally {
      await detail.setOpenDataStatus(originalValue);
    }
  });

  test("DAT-12 - détacher une donnée depuis la page de détail", async ({
    page,
    data,
  }) => {
    // Application dédiée et jetable (cf. commentaire DAT-07).
    const { applicationId, dataApplicationId, descriptionId } =
      await data.provisionAttachedData();

    const detail = new DataDetailPage(page);
    try {
      await detail.open(applicationId, dataApplicationId);
      await detail.expectLoaded();
      await detail.deleteFromDetail();
      await detail.expectRedirectedToDataTab(applicationId);
      // Le détachement est le geste testé lui-même (cf. DAT-10) : pas de détachement manuel ici.
    } finally {
      await data.deleteDataDescription(descriptionId); // sinon la description resterait orpheline (#2117)
      await data.removeApplication(applicationId);
    }
  });

  test("DAT-13 - créer une donnée avec plusieurs familles métier (existante + nouvelle inline)", async ({
    page,
    data,
  }) => {
    const existingFamily = await data.firstDataFamily();
    test.skip(!existingFamily, "Aucune famille métier dans le référentiel");

    const ts = Date.now();
    const uniqueName = `E2E DAT-13 ${ts}`;
    const newFamilyPath = `E2E DAT-13 Famille ${ts}`;
    const app = await data.createTestApplication(`E2E DAT-13 App ${ts}`);

    const fiche = new ApplicationPage(page);
    let dataApplicationId: string | null = null;
    try {
      await fiche.open(app.id, "tab-data");
      await fiche.expectDataSourcesTabLoaded();
      await fiche.openAddDataModal();
      await fiche.switchToCreateNewDescription();
      await fiche.fillNewDescriptionName(uniqueName);
      await fiche.addExistingFamily(existingFamily!.path);
      await fiche.createNewFamilyInline(newFamilyPath);
      dataApplicationId = await fiche.submitNewDataAttachment();
      await fiche.expectDataRowContainsAll(uniqueName, [
        existingFamily!.path,
        newFamilyPath,
      ]);
    } finally {
      if (dataApplicationId) {
        await data.detachDataFromApplication(app.id, dataApplicationId);
      }
      // Suppression par noms uniques : description + famille créées inline (#2117).
      await data.deleteDataDescriptionByName(uniqueName);
      await data.deleteDataFamilyByPath(newFamilyPath);
      await data.removeApplication(app.id);
    }
  });

  test("DAT-14 - modifier les familles d'une donnée existante (ajouter puis retirer) depuis l'onglet Données", async ({
    page,
    data,
  }) => {
    const family = await data.firstDataFamily();
    test.skip(!family, "Aucune famille métier dans le référentiel");

    // Application dédiée et jetable (cf. commentaire DAT-07).
    const { applicationId, dataApplicationId, descriptionId } =
      await data.provisionAttachedData();

    const fiche = new ApplicationPage(page);
    try {
      await fiche.open(applicationId, "tab-data");
      await fiche.expectDataSourcesTabLoaded();

      // Ajout : la donnée provisionnée n'a initialement aucune famille.
      await fiche.openEditDataModal(dataApplicationId);
      await fiche.addExistingFamily(family!.path);
      await fiche.submitDataEdit();
      await fiche.expectDataRowByIdContains(dataApplicationId, family!.path);

      // Retrait : rouvre l'édition et retire la famille ajoutée via son chip.
      await fiche.openEditDataModal(dataApplicationId);
      await fiche.removeFamilyChip(family!.path);
      await fiche.submitDataEdit();
      await fiche.expectDataRowNotContains(dataApplicationId, family!.path);
    } finally {
      await data.detachDataFromApplication(applicationId, dataApplicationId);
      await data.deleteDataDescription(descriptionId); // sinon la description resterait orpheline (#2117)
      await data.removeApplication(applicationId);
    }
  });

  test("DAT-15 - créer une donnée avec une application source (tag cliquable redirigeant vers sa fiche)", async ({
    page,
    data,
  }) => {
    const ts = Date.now();
    const uniqueName = `E2E DAT-15 ${ts}`;
    // Applications dédiées et jetables (cf. commentaire DAT-07) : la consommatrice porte l'onglet
    // Données testé, la source sert uniquement de cible de navigation.
    const consumerApp = await data.createTestApplication(
      `E2E DAT-15 Consumer ${ts}`,
    );
    const sourceApp = await data.createTestApplication(
      `E2E DAT-15 Source ${ts}`,
    );

    const fiche = new ApplicationPage(page);
    let dataApplicationId: string | null = null;
    try {
      await fiche.open(consumerApp.id, "tab-data");
      await fiche.expectDataSourcesTabLoaded();
      await fiche.openAddDataModal();
      await fiche.switchToCreateNewDescription();
      await fiche.fillNewDescriptionName(uniqueName);
      await fiche.addApplicationSource(sourceApp.label);
      dataApplicationId = await fiche.submitNewDataAttachment();
      await fiche.expectDataRowContainsAll(uniqueName, [sourceApp.label]);

      await fiche.clickApplicationSourceTag(
        dataApplicationId!,
        sourceApp.label,
      );
      await fiche.expectOnApplicationProfile(sourceApp.id);
    } finally {
      if (dataApplicationId) {
        await data.detachDataFromApplication(consumerApp.id, dataApplicationId);
      }
      await data.deleteDataDescriptionByName(uniqueName); // description créée via l'UI (#2117)
      await data.removeApplication(consumerApp.id);
      await data.removeApplication(sourceApp.id);
    }
  });

  test("DAT-16 - le détail affiche l'application utilisatrice et les applications sources (tags cliquables)", async ({
    page,
    data,
  }) => {
    const ts = Date.now();
    const consumerApp = await data.createTestApplication(
      `E2E DAT-16 Consumer ${ts}`,
    );
    const sourceApp = await data.createTestApplication(
      `E2E DAT-16 Source ${ts}`,
    );
    const description = await data.createDataDescription({
      name: `E2E DAT-16 ${ts}`,
      applicationSourceIds: [sourceApp.id],
    });
    const dataApplication = await data.attachDataToApplication(
      consumerApp.id,
      description.id,
    );

    const detail = new DataDetailPage(page);
    try {
      await detail.open(consumerApp.id, dataApplication.id);
      await detail.expectLoaded();
      await detail.expectUsageApplication(consumerApp.label);
      await detail.expectSourceApplication(sourceApp.label);

      await detail.clickUsageApplication();
      await detail.expectOnApplicationProfile(consumerApp.id);

      await detail.open(consumerApp.id, dataApplication.id);
      await detail.clickSourceApplication(sourceApp.label);
      await detail.expectOnApplicationProfile(sourceApp.id);
    } finally {
      await data.detachDataFromApplication(consumerApp.id, dataApplication.id);
      await data.deleteDataDescription(description.id);
      await data.removeApplication(consumerApp.id);
      await data.removeApplication(sourceApp.id);
    }
  });
});
