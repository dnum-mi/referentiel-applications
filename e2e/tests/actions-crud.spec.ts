import { expect, test } from "../fixtures/test";
import { ApplicationPage, CreateApplicationPage } from "../pom";
import { loginAs } from "../pom/auth";

test.describe("Actions CRUD de base", () => {
  test("CRU-01 - modifier un acteur existant et vérifier la liste", async ({
    page,
    data,
  }) => {
    const app = await data.applicationWithActors();
    test.skip(!app, "Aucune application avec acteur dans le jeu de données");

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-actors");
    await fiche.expectActorsTabLoaded();

    const newFirstname = `E2E-${Date.now()}`;
    const newLastname = "ModifTest";
    await fiche.editFirstActor(newFirstname, newLastname);
    await fiche.expectActorRowContains(newFirstname);
    await fiche.expectActorRowContains(newLastname);
  });

  test("CRU-02 - supprimer un acteur par sélection multiple", async ({
    page,
    data,
  }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const actorTypes = await data.actorTypes();
    const typeId = actorTypes?.[0]?.id;
    test.skip(!typeId, "Aucun type d'acteur disponible");

    const ts = Date.now();
    const a1 = await data.createActor(app!.id, {
      firstname: `E2E-A-${ts}`,
      lastname: "Del1",
      actorTypeId: typeId,
    });
    const a2 = await data.createActor(app!.id, {
      firstname: `E2E-B-${ts}`,
      lastname: "Del2",
      actorTypeId: typeId,
    });

    try {
      // Sans cette garde, une création refusée par l'API passe inaperçue et l'échec se déplace
      // vingt secondes plus tard sur une ligne de tableau absente.
      expect(a1, "acteur de test 1 non créé").not.toBeNull();
      expect(a2, "acteur de test 2 non créé").not.toBeNull();

      const fiche = new ApplicationPage(page);
      await fiche.open(app!.id, "tab-actors");
      await fiche.expectActorsTabLoaded();
      await fiche.bulkDeleteActors(2);
    } finally {
      if (a1) await data.deleteActor(app!.id, a1.id).catch(() => {});
      if (a2) await data.deleteActor(app!.id, a2.id).catch(() => {});
    }
  });

  test("CRU-03 - créer un acteur groupe", async ({ page, data }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const actorTypes = await data.actorTypes();
    test.skip(!actorTypes?.length, "Aucun type d'acteur disponible");

    // Une organisation EXISTANTE : le champ est un sélecteur (`OrganizationSearchSelect`), pas une
    // saisie libre — un libellé inventé ne remonte aucun résultat et ne peut pas être choisi.
    const orgPath = await data.anyOrganizationPath();
    test.skip(!orgPath, "Aucune organisation dans le jeu de données");

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-actors");
    await fiche.addGroupActor(actorTypes![0].label, orgPath!);
  });

  test("CRU-04 - droits d'écriture sur les acteurs (lecteur)", async ({
    data,
    browser,
  }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const readerCtx = await browser.newContext();
    try {
      const readerPage = readerCtx.newPage();
      await loginAs(await readerPage, "user");
      const fiche = new ApplicationPage(await readerPage);
      await fiche.open(app!.id, "tab-actors");
      await fiche.expectActorsTabLoaded();
      await fiche.expectActorAddDisabled();
    } finally {
      await readerCtx.close();
    }
  });

  test("CRU-05 - modifier les informations générales", async ({
    page,
    data,
  }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-infos");
    await fiche.expectInfosTabLoaded();

    const detail = await data.applicationDetail(app!.id);
    const origLabel = (detail?.label as string) ?? app!.label;
    const origDesc = (detail?.description as string) ?? "";

    const newLabel = `E2E-CRU05-${Date.now()}`;
    const newDesc = `Description test CRU-05 ${Date.now()}`;

    try {
      await fiche.editInfos(newLabel, newDesc, "R1");
      await fiche.expectTitle(newLabel);
      await fiche.expectDescription(newDesc);
    } finally {
      await data.modifyApplication(app!.id, {
        label: origLabel,
        description: origDesc,
      });
    }
  });

  test("CRU-06 - ajouter / retirer une finalité et une population", async ({
    page,
    data,
  }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-infos");
    await fiche.expectInfosTabLoaded();
    await fiche.openInfoEdit();
    await fiche.addPurpose();
    await fiche.addPopulation();
  });

  test("CRU-07 - modifier les informations générales et sauvegarder", async ({
    page,
    data,
  }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-infos");
    await fiche.expectInfosTabLoaded();
    await fiche.editAndSaveInfos();
  });

  test("CRU-08 - créer une application de bout en bout", async ({
    page,
    data,
  }) => {
    const orgPath = await data.anyOrganizationPath();
    test.skip(!orgPath, "Aucune organisation dans le jeu de données");

    const ts = Date.now();
    const label = `E2E-CRU08-${ts}`;
    const createPage = new CreateApplicationPage(page);
    await createPage.open();
    await createPage.fillStep1(label, "Test app created by CRU-08");
    await createPage.nextStep(2);
    await createPage.nextStep(3);
    await createPage.fillMoaStep(
      `moa-${ts}@test.example.com`,
      "E2E-MOA",
      "Test",
      orgPath!,
    );
    await createPage.nextStep(4);
    await createPage.fillMoeStep(
      `moe-${ts}@test.example.com`,
      "E2E-MOE",
      "Test",
      orgPath!,
    );
    await createPage.submit();
    await createPage.expectRedirectedToApp();

    const fiche = new ApplicationPage(page);
    await fiche.expectHeader();
    await fiche.expectTitle(label);

    const created = await data.applicationByLabel(label);
    try {
      expect(created).not.toBeNull();
    } finally {
      if (created) await data.removeApplication(created!.id);
    }
  });

  test("CRU-16 - créer une application avec MOA et MOE de type groupe (isGroup)", async ({
    page,
    data,
  }) => {
    const orgPath = await data.anyOrganizationPath();
    test.skip(!orgPath, "Aucune organisation dans le jeu de données");

    const ts = Date.now();
    const label = `E2E-CRU16-${ts}`;
    const createPage = new CreateApplicationPage(page);
    await createPage.open();
    await createPage.fillStep1(
      label,
      "Test app created by CRU-16 with group actors",
    );
    await createPage.nextStep(2);
    await createPage.nextStep(3);
    await createPage.fillMoaStepAsGroup(
      `moa-group-${ts}@test.example.com`,
      orgPath!,
    );
    await createPage.nextStep(4);
    await createPage.fillMoeStepAsGroup(
      `moe-group-${ts}@test.example.com`,
      orgPath!,
    );
    await createPage.submit();
    await createPage.expectRedirectedToApp();

    const created = await data.applicationByLabel(label);
    try {
      expect(created).not.toBeNull();
      const actors = await data.applicationActors(created!.id);
      expect(actors?.length).toBeGreaterThanOrEqual(2);

      // On cible les DEUX acteurs créés par ce test, et pas l'ensemble : depuis #2303 le créateur
      // de l'application est ajouté automatiquement comme acteur, et il n'est évidemment pas un
      // groupe — un `every()` sur toute la liste ne peut plus être vrai.
      const mine = (actors ?? []).filter((a) =>
        [
          `moa-group-${ts}@test.example.com`,
          `moe-group-${ts}@test.example.com`,
        ].includes(a.email ?? ""),
      );
      expect(mine).toHaveLength(2);
      expect(mine.every((a) => a.isGroup === true)).toBe(true);
    } finally {
      if (created) await data.removeApplication(created!.id);
    }
  });

  test("CRU-09 - supprimer une application", async ({ page, data }) => {
    const orgPath = await data.anyOrganizationPath();
    test.skip(!orgPath, "Aucune organisation dans le jeu de données");

    const ts = Date.now();
    const label = `E2E-CRU09-${ts}`;

    const createPage = new CreateApplicationPage(page);
    await createPage.open();
    await createPage.fillStep1(label, "App to delete CRU-09");
    await createPage.nextStep(2);
    await createPage.nextStep(3);
    await createPage.fillMoaStep(
      `moa-${ts}@test.example.com`,
      "E2E-MOA",
      "Del",
      orgPath!,
    );
    await createPage.nextStep(4);
    await createPage.fillMoeStep(
      `moe-${ts}@test.example.com`,
      "E2E-MOE",
      "Del",
      orgPath!,
    );
    await createPage.submit();
    await createPage.expectRedirectedToApp();

    const fiche = new ApplicationPage(page);
    await fiche.deleteApplication(label);

    await expect
      .poll(
        async () => {
          const found = await data.applicationByLabel(label);
          return found;
        },
        { timeout: 10000 },
      )
      .toBeNull();
  });

  test("CRU-10 - cycle de vie d'un hébergement (créer / modifier / supprimer)", async ({
    page,
    data,
  }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-infos");
    await fiche.expectInfosTabLoaded();

    const hostingLabel = `E2E-Host-${Date.now()}`;
    await fiche.addHosting(hostingLabel);
    await fiche.editFirstHosting(`${hostingLabel}-mod`);
    await fiche.deleteFirstHosting();
  });

  test("CRU-11 - cycle de vie d'un nom alternatif", async ({ page, data }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-infos");
    await fiche.expectInfosTabLoaded();

    const labelValue = `E2E-Label-${Date.now()}`;
    await fiche.addLabel(labelValue);
    await fiche.editFirstLabel(`${labelValue}-mod`);
    await fiche.deleteFirstLabel();
  });

  test("CRU-12 - cycle de vie d'un statut", async ({ page, data }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-statuses");
    await fiche.expectStatusesTabLoaded();

    await fiche.addStatus("in_production");
    await fiche.editFirstStatus("under_construction");
    await fiche.deleteFirstStatus();
  });

  test("CRU-13 - cycle de vie d'une relation entre applications", async ({
    page,
    data,
  }) => {
    const apps = await data.twoApplications();
    test.skip(!apps, "Moins de 2 applications dans le jeu de données");

    const [appA, appB] = apps!;
    const fiche = new ApplicationPage(page);
    await fiche.open(appA.id, "tab-relations");

    await fiche.addRelation(appB.label);
    await fiche.expectRelationsTableContains(appB.label);
    await fiche.deleteSelectedRelations();
  });

  test("CRU-14 - cycle de vie d'un lien externe", async ({ page, data }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-links");
    await fiche.expectLinksTabLoaded();

    const url = `https://e2e-test-${Date.now()}.example.com`;
    await fiche.addLink(url, "E2E test link");
    await fiche.editFirstLink(`${url}/updated`);
    await fiche.deleteFirstLink();
  });

  test("CRU-15 - cycle de vie d'une déclaration RGAA", async ({
    page,
    data,
  }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-compliances");
    await fiche.expectCompliancesTabLoaded();

    await fiche.addRgaaDeclaration(
      `https://e2e-rgaa-${Date.now()}.example.com`,
      "75",
    );
    await fiche.editFirstRgaa("90");
    await fiche.deleteFirstRgaa();
  });
});
