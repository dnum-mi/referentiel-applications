import { expect, test } from "../fixtures/test";
import { AdminPage, switchTo } from "../pom";
import { buildActorImportWorkbook } from "../support/actor-import-xlsx";
import { dbQuery } from "../support/db";
import { buildSheetWorkbook } from "../support/import-xlsx";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * Résout un type d'acteur directement en base. L'API `/actorTypes` n'est pas exposée par le
 * résolveur e2e courant ; le type d'acteur est un prérequis non inscriptible pour ce protocole.
 */
async function firstActorType(): Promise<{ id: string; code: string } | null> {
  const rows = await dbQuery<{ id: string; code: string }>(
    `SELECT id, code FROM "ActorType" WHERE code IS NOT NULL ORDER BY code LIMIT 1`,
  );
  return rows[0] ?? null;
}

/**
 * Crée une application jetable directement en base (la conformité est 1:1 ; on isole chaque test
 * sur sa propre application pour éviter toute collision entre navigateurs exécutés en parallèle).
 */
async function createThrowawayApp(label: string): Promise<string> {
  const rows = await dbQuery<{ id: string }>(
    `INSERT INTO "Application" (id, label, description, quality)
     VALUES (gen_random_uuid(), $1, $2, 0) RETURNING id`,
    [label, "Application de test e2e (import)"],
  );
  return rows[0].id;
}

/** Supprime l'application jetable et sa conformité éventuelle. */
async function deleteThrowawayApp(appId: string): Promise<void> {
  await dbQuery(`DELETE FROM "Compliance" WHERE "applicationId" = $1`, [
    appId,
  ]).catch(() => {});
  await dbQuery(`DELETE FROM "Application" WHERE id = $1`, [appId]).catch(
    () => {},
  );
}

async function firstOrganizationId(): Promise<string | null> {
  const rows = await dbQuery<{ id: string }>(
    `SELECT id FROM "Organization" LIMIT 1`,
  );
  return rows[0]?.id ?? null;
}

test.describe("Administration des référentiels", () => {
  // L'administration requiert une session admin. Certains cas n'utilisent que `page` : on consomme
  // la fixture `data` (qui exécute `loginAs(admin)`) ici pour garantir l'authentification de chaque
  // test, sinon `/administration` redirige vers Keycloak et `admin-tabs` n'apparaît jamais.
  test.beforeEach(async ({ data }) => {
    void data;
  });

  test("ADM-01 - créer une organisation et la retrouver", async ({ page }) => {
    const ts = Date.now();
    const orgPath = `E2E/ADM01/${ts}`;
    const admin = new AdminPage(page);
    await admin.open();
    await admin.openOrganizationsTab();
    await admin.createOrganization(orgPath, `ADM01-${ts}`);
    await admin.expectOrganizationRow(orgPath);
  });

  test("ADM-02 - modifier une organisation", async ({ page, data }) => {
    const ts = Date.now();
    const orgPath = `E2E/ADM02/${ts}`;
    const org = await data.createOrganization(orgPath);
    test.skip(!org, "Impossible de créer l'organisation de test");

    try {
      const admin = new AdminPage(page);
      await admin.open();
      await admin.openOrganizationsTab();
      await admin.editOrganization(orgPath, `SIG-${ts}`);
      await admin.expectOrganizationRow(orgPath);
    } finally {
      if (org) await data.deleteOrganization(org.id).catch(() => {});
    }
  });

  test("ADM-03 - gérer les références MAIA d'une organisation", async ({
    page,
    data,
  }) => {
    const ts = Date.now();
    const orgPath = `E2E/ADM03/${ts}`;
    const org = await data.createOrganization(orgPath);
    test.skip(!org, "Impossible de créer l'organisation de test");

    try {
      const admin = new AdminPage(page);
      await admin.open();
      await admin.openOrganizationsTab();
      await admin.addMaiaReference(orgPath, `MAIA-REF-${ts}`);
      await admin.deleteMaiaReference(orgPath);
    } finally {
      if (org) await data.deleteOrganization(org.id).catch(() => {});
    }
  });

  test("ADM-04 - supprimer une organisation", async ({ page, data }) => {
    const ts = Date.now();
    const orgPath = `E2E/ADM04/${ts}`;
    const org = await data.createOrganization(orgPath);
    test.skip(!org, "Impossible de créer l'organisation de test");

    const admin = new AdminPage(page);
    await admin.open();
    await admin.openOrganizationsTab();
    await admin.deleteOrganization(orgPath);
    await admin.expectOrganizationAbsent(orgPath);
  });

  test("ADM-05 - cycle de vie d'un tag", async ({ page }) => {
    const ts = Date.now();
    const tagName = `e2e-adm05-${ts}`;
    const renamedTag = `e2e-adm05-renamed-${ts}`;

    const admin = new AdminPage(page);
    await admin.open();
    await admin.openTagsTab();
    await admin.createTag(tagName);
    await admin.expectTagRow(tagName);
    await admin.editTag(tagName, renamedTag);
    await admin.expectTagRow(renamedTag);
    await admin.deleteTag(renamedTag);
  });

  test("ADM-06 - cycle de vie d'une source de noms alternatifs", async ({
    page,
  }) => {
    const ts = Date.now();
    const source = `E2E-ADM06-${ts}`;
    const renamedSource = `E2E-ADM06-RENAMED-${ts}`;

    const admin = new AdminPage(page);
    await admin.open();
    await admin.openLabelSourcesTab();
    await admin.createLabelSource(source);
    await admin.expectLabelSourceRow(source);
    await admin.editLabelSource(source, renamedSource);
    await admin.expectLabelSourceRow(renamedSource);
    await admin.deleteLabelSource(renamedSource);
  });

  test("ADM-07 - créer une campagne dette IT et la retrouver", async ({
    page,
    data,
  }) => {
    const year = 2099;
    // Idempotence : repartir d'un état propre si un run précédent a laissé la campagne.
    await data.removeCampaignYear(year);

    const admin = new AdminPage(page);
    await admin.open();
    await admin.openCampaignsTab();
    await admin.createCampaign(year, "Campagne E2E ADM-07");
    await admin.expectCampaignRow(year);
    await admin.deleteCampaign(year);
  });

  test("ADM-08 - importer un acteur via un fichier Excel (création)", async ({
    page,
    data,
  }) => {
    const ts = Date.now();
    const lastname = `IMPORT-CREATE-${ts}`;
    const email = `e2e-adm08-${ts}@example.com`;
    const app = await data.firstApplication();
    const actorType = await firstActorType();
    test.skip(!app, "Aucune application disponible");
    test.skip(!actorType, "Aucun type d'acteur disponible");

    try {
      const workbook = await buildActorImportWorkbook([
        {
          applicationId: app!.id,
          firstname: "Acteur",
          lastname,
          role: actorType!.code,
          email,
        },
      ]);

      const admin = new AdminPage(page);
      await admin.open();
      await admin.openBatchDataTab();
      await admin.importExcel({
        name: `import-adm08-${ts}.xlsx`,
        mimeType: XLSX_MIME,
        buffer: workbook,
      });

      await admin.expectImportReportSummary(/1 créé\(s\)/);
      await admin.expectImportReportSummary(/0 en erreur/);
      await admin.expectImportReportDownloadable();

      // Non-régression : l'acteur a bien été créé en base par l'import.
      const created = await dbQuery<{ lastname: string }>(
        `SELECT lastname FROM "Actor" WHERE email = $1`,
        [email],
      );
      expect(created.some((a) => a.lastname === lastname)).toBe(true);
    } finally {
      await dbQuery(`DELETE FROM "Actor" WHERE email = $1`, [email]).catch(
        () => {},
      );
    }
  });

  test("ADM-09 - importer un acteur via un fichier Excel (mise à jour)", async ({
    page,
    data,
  }) => {
    const ts = Date.now();
    const newLastname = `IMPORT-UPDATE-${ts}`;
    const email = `e2e-adm09-${ts}@example.com`;
    const app = await data.firstApplication();
    const actorType = await firstActorType();
    test.skip(!app, "Aucune application disponible");
    test.skip(!actorType, "Aucun type d'acteur disponible");

    const seeded = await data.createActor(app!.id, {
      firstname: "Acteur",
      lastname: `SEED-${ts}`,
      email,
      actorTypeId: actorType!.id,
      isGroup: false,
    });
    test.skip(!seeded, "Impossible de créer l'acteur de test");

    try {
      const workbook = await buildActorImportWorkbook([
        {
          id: seeded!.id,
          applicationId: app!.id,
          firstname: "Acteur",
          lastname: newLastname,
          role: actorType!.code,
          email,
        },
      ]);

      const admin = new AdminPage(page);
      await admin.open();
      await admin.openBatchDataTab();
      await admin.importExcel({
        name: `import-adm09-${ts}.xlsx`,
        mimeType: XLSX_MIME,
        buffer: workbook,
      });

      await admin.expectImportReportSummary(/1 mis à jour/);
      await admin.expectImportReportSummary(/0 en erreur/);

      // Non-régression : la mise à jour est bien appliquée en base.
      const updated = await dbQuery<{ lastname: string }>(
        `SELECT lastname FROM "Actor" WHERE id = $1`,
        [seeded!.id],
      );
      expect(updated[0]?.lastname).toBe(newLastname);
    } finally {
      if (seeded) await data.deleteActor(app!.id, seeded.id).catch(() => {});
    }
  });

  test("ADM-16 - lister et rechercher les acteurs (admin)", async ({
    page,
    data,
  }) => {
    const ts = Date.now();
    const email = `e2e-adm11-${ts}@example.com`;
    const app = await data.firstApplication();
    const actorType = await firstActorType();
    const orgId = await firstOrganizationId();
    test.skip(!app, "Aucune application disponible");
    test.skip(!actorType, "Aucun type d'acteur disponible");
    test.skip(!orgId, "Aucune organisation disponible");

    const seeded = await data.createActor(app!.id, {
      firstname: "Acteur",
      lastname: `ADM13-${ts}`,
      email,
      actorTypeId: actorType!.id,
      organizationId: orgId,
      isGroup: false,
    });
    test.skip(!seeded, "Impossible de créer l'acteur de test");

    try {
      const admin = new AdminPage(page);
      await admin.open();
      await admin.openActorsTab();
      await admin.expectActorRow(email);
    } finally {
      if (seeded) await data.deleteActor(app!.id, seeded.id).catch(() => {});
    }
  });

  test("ADM-17 - modifier un acteur unique (admin)", async ({ page, data }) => {
    const ts = Date.now();
    const email = `e2e-adm16-${ts}@example.com`;
    const newLastname = `MODIFIED-${ts}`;
    const app = await data.firstApplication();
    const actorType = await firstActorType();
    const orgId = await firstOrganizationId();
    test.skip(!app, "Aucune application disponible");
    test.skip(!actorType, "Aucun type d'acteur disponible");
    test.skip(!orgId, "Aucune organisation disponible");

    const seeded = await data.createActor(app!.id, {
      firstname: "Acteur",
      lastname: `SEED-${ts}`,
      email,
      actorTypeId: actorType!.id,
      organizationId: orgId,
      isGroup: false,
    });
    test.skip(!seeded, "Impossible de créer l'acteur de test");

    try {
      const admin = new AdminPage(page);
      await admin.open();
      await admin.openActorsTab();
      await admin.editActorAndSave(email, newLastname);
    } finally {
      if (seeded) await data.deleteActor(app!.id, seeded.id).catch(() => {});
    }
  });

  test("ADM-18 - supprimer un acteur unique (admin)", async ({
    page,
    data,
  }) => {
    const ts = Date.now();
    const email = `e2e-adm17-${ts}@example.com`;
    const app = await data.firstApplication();
    const actorType = await firstActorType();
    const orgId = await firstOrganizationId();
    test.skip(!app, "Aucune application disponible");
    test.skip(!actorType, "Aucun type d'acteur disponible");
    test.skip(!orgId, "Aucune organisation disponible");

    const seeded = await data.createActor(app!.id, {
      firstname: "Acteur",
      lastname: `SEED-${ts}`,
      email,
      actorTypeId: actorType!.id,
      organizationId: orgId,
      isGroup: false,
    });
    test.skip(!seeded, "Impossible de créer l'acteur de test");

    const admin = new AdminPage(page);
    await admin.open();
    await admin.openActorsTab();
    await admin.deleteActorAndConfirm(email);
    await admin.expectActorAbsent(email);
  });

  test("ADM-19 - modifier tous les acteurs par email (admin)", async ({
    page,
    data,
  }) => {
    const ts = Date.now();
    const email = `e2e-adm16-${ts}@example.com`;
    const newFirstname = `BULKEDIT-${ts}`;
    const apps = await data.twoApplications();
    const actorType = await firstActorType();
    const orgId = await firstOrganizationId();
    test.skip(!apps, "Besoin de deux applications");
    test.skip(!actorType, "Aucun type d'acteur disponible");
    test.skip(!orgId, "Aucune organisation disponible");

    const actor1 = await data.createActor(apps![0].id, {
      firstname: "Acteur",
      lastname: `SEED1-${ts}`,
      email,
      actorTypeId: actorType!.id,
      organizationId: orgId,
      isGroup: false,
    });
    const actor2 = await data.createActor(apps![1].id, {
      firstname: "Acteur",
      lastname: `SEED2-${ts}`,
      email,
      actorTypeId: actorType!.id,
      organizationId: orgId,
      isGroup: false,
    });
    test.skip(!actor1 || !actor2, "Impossible de créer les acteurs de test");

    try {
      const admin = new AdminPage(page);
      await admin.open();
      await admin.openActorsTab();
      await admin.editAllActorsAndSave(email, newFirstname);
    } finally {
      if (actor1)
        await data.deleteActor(apps![0].id, actor1.id).catch(() => {});
      if (actor2)
        await data.deleteActor(apps![1].id, actor2.id).catch(() => {});
    }
  });

  test("ADM-20 - supprimer tous les acteurs par email (admin)", async ({
    page,
    data,
  }) => {
    const ts = Date.now();
    const email = `e2e-adm17-${ts}@example.com`;
    const apps = await data.twoApplications();
    const actorType = await firstActorType();
    const orgId = await firstOrganizationId();
    test.skip(!apps, "Besoin de deux applications");
    test.skip(!actorType, "Aucun type d'acteur disponible");
    test.skip(!orgId, "Aucune organisation disponible");

    const actor1 = await data.createActor(apps![0].id, {
      firstname: "Acteur",
      lastname: `SEED1-${ts}`,
      email,
      actorTypeId: actorType!.id,
      organizationId: orgId,
      isGroup: false,
    });
    const actor2 = await data.createActor(apps![1].id, {
      firstname: "Acteur",
      lastname: `SEED2-${ts}`,
      email,
      actorTypeId: actorType!.id,
      organizationId: orgId,
      isGroup: false,
    });
    test.skip(!actor1 || !actor2, "Impossible de créer les acteurs de test");

    try {
      const admin = new AdminPage(page);
      await admin.open();
      await admin.openActorsTab();
      await admin.deleteAllActorsAndConfirm(email);
      await admin.expectActorAbsent(email);
    } finally {
      if (actor1)
        await data.deleteActor(apps![0].id, actor1.id).catch(() => {});
      if (actor2)
        await data.deleteActor(apps![1].id, actor2.id).catch(() => {});
    }
  });

  test("ADM-10 - import Excel : ligne fautive consignée, traitement poursuivi", async ({
    page,
    data,
  }) => {
    const ts = Date.now();
    const okEmail = `e2e-adm10-ok-${ts}@example.com`;
    const koEmail = `e2e-adm10-ko-${ts}@example.com`;
    const okLastname = `IMPORT-OK-${ts}`;
    const app = await data.firstApplication();
    const actorType = await firstActorType();
    test.skip(!app, "Aucune application disponible");
    test.skip(!actorType, "Aucun type d'acteur disponible");

    try {
      // Une ligne valide (création) + une ligne fautive (rôle inexistant → non résolu).
      const workbook = await buildActorImportWorkbook([
        {
          applicationId: app!.id,
          firstname: "Acteur",
          lastname: okLastname,
          role: actorType!.code,
          email: okEmail,
        },
        {
          applicationId: app!.id,
          firstname: "Acteur",
          lastname: `IMPORT-KO-${ts}`,
          role: `ROLE_INEXISTANT_${ts}`,
          email: koEmail,
        },
      ]);

      const admin = new AdminPage(page);
      await admin.open();
      await admin.openBatchDataTab();
      await admin.importExcel({
        name: `import-adm10-${ts}.xlsx`,
        mimeType: XLSX_MIME,
        buffer: workbook,
      });

      // Le traitement continue malgré l'erreur : 1 création + 1 ligne en erreur.
      await admin.expectImportReportSummary(/1 créé\(s\)/);
      await admin.expectImportReportSummary(/1 en erreur/);
      await admin.expectImportReportContains(/introuvable/i);

      // La ligne valide est bien créée, la fautive ne l'est pas.
      const ok = await dbQuery(`SELECT id FROM "Actor" WHERE email = $1`, [
        okEmail,
      ]);
      const ko = await dbQuery(`SELECT id FROM "Actor" WHERE email = $1`, [
        koEmail,
      ]);
      expect(ok.length).toBe(1);
      expect(ko.length).toBe(0);
    } finally {
      await dbQuery(`DELETE FROM "Actor" WHERE email = ANY($1)`, [
        [okEmail, koEmail],
      ]).catch(() => {});
    }
  });

  test("ADM-11 - importer une conformité via un fichier Excel (création)", async ({
    page,
  }) => {
    const ts = Date.now();
    const impact = `E2E-IMPACT-${ts}`;
    const appId = await createThrowawayApp(`E2E ADM11 ${ts}`);

    try {
      const workbook = await buildSheetWorkbook(
        "Conformités",
        [
          "ID Application",
          "DIMA Impact métier",
          "DIMA Durée (heures)",
          "DSFR Implémenté",
        ],
        // 4 h : valeur de durée DIMA autorisée (cf. DIMA_DURATION_HOURS_VALUES, #1901/#1910).
        [[appId, impact, 4, "Oui"]],
      );

      const admin = new AdminPage(page);
      await admin.open();
      await admin.openBatchDataTab();
      await admin.importExcel({
        name: `import-adm11-${ts}.xlsx`,
        mimeType: XLSX_MIME,
        buffer: workbook,
      });

      await admin.expectImportReportSummary(/1 créé\(s\)/);
      await admin.expectImportReportSummary(/0 en erreur/);

      // Non-régression : la conformité est créée avec les valeurs coercées.
      const rows = await dbQuery<{
        dima_business_impact: string;
        dima_duration_hours: number;
        dsfr_implemented: boolean;
      }>(
        `SELECT dima_business_impact, dima_duration_hours, dsfr_implemented
         FROM "Compliance" WHERE "applicationId" = $1`,
        [appId],
      );
      expect(rows[0]?.dima_business_impact).toBe(impact);
      expect(rows[0]?.dima_duration_hours).toBe(4);
      expect(rows[0]?.dsfr_implemented).toBe(true);
    } finally {
      await deleteThrowawayApp(appId);
    }
  });

  test("ADM-12 - importer une conformité via un fichier Excel (mise à jour)", async ({
    page,
  }) => {
    const ts = Date.now();
    const newImpact = `E2E-IMPACT-MAJ-${ts}`;
    const appId = await createThrowawayApp(`E2E ADM12 ${ts}`);

    // Conformité initiale posée en base (état de départ du protocole).
    await dbQuery(
      `INSERT INTO "Compliance" (id, "applicationId", dima_business_impact)
       VALUES (gen_random_uuid(), $1, $2)`,
      [appId, `OLD-${ts}`],
    );

    try {
      const workbook = await buildSheetWorkbook(
        "Conformités",
        ["ID Application", "DIMA Impact métier"],
        [[appId, newImpact]],
      );

      const admin = new AdminPage(page);
      await admin.open();
      await admin.openBatchDataTab();
      await admin.importExcel({
        name: `import-adm12-${ts}.xlsx`,
        mimeType: XLSX_MIME,
        buffer: workbook,
      });

      await admin.expectImportReportSummary(/1 mis à jour/);
      await admin.expectImportReportSummary(/0 en erreur/);

      // Non-régression : la conformité existante est bien mise à jour.
      const rows = await dbQuery<{ dima_business_impact: string }>(
        `SELECT dima_business_impact FROM "Compliance" WHERE "applicationId" = $1`,
        [appId],
      );
      expect(rows[0]?.dima_business_impact).toBe(newImpact);
    } finally {
      await deleteThrowawayApp(appId);
    }
  });

  test("ADM-13 - importer une application via un fichier Excel (mise à jour)", async ({
    page,
  }) => {
    const ts = Date.now();
    const newLabel = `E2E-ADM13-MAJ-${ts}`;
    const appId = await createThrowawayApp(`E2E ADM13 ${ts}`);

    try {
      const workbook = await buildSheetWorkbook(
        "Applications",
        ["Identifiant", "Libellé", "Description"],
        [[appId, newLabel, "Mise à jour par import"]],
      );

      const admin = new AdminPage(page);
      await admin.open();
      await admin.openBatchDataTab();
      await admin.importExcel({
        name: `import-adm13-${ts}.xlsx`,
        mimeType: XLSX_MIME,
        buffer: workbook,
      });

      await admin.expectImportReportSummary(/1 mis à jour/);
      await admin.expectImportReportSummary(/0 en erreur/);

      // Non-régression : le nouveau libellé est appliqué à l'application existante.
      const rows = await dbQuery<{ label: string }>(
        `SELECT label FROM "Application" WHERE id = $1`,
        [appId],
      );
      expect(rows[0]?.label).toBe(newLabel);
    } finally {
      await deleteThrowawayApp(appId);
    }
  });

  test("ADM-14 - importer une application via un fichier Excel (création)", async ({
    page,
  }) => {
    const ts = Date.now();
    const label = `E2E-ADM14-${ts}`;
    let createdId: string | undefined;

    try {
      const workbook = await buildSheetWorkbook(
        "Applications",
        ["Identifiant", "Libellé", "Description"],
        [["", label, "Créée par import Excel"]],
      );

      const admin = new AdminPage(page);
      await admin.open();
      await admin.openBatchDataTab();
      await admin.importExcel({
        name: `import-adm14-${ts}.xlsx`,
        mimeType: XLSX_MIME,
        buffer: workbook,
      });

      await admin.expectImportReportSummary(/1 créé\(s\)/);
      await admin.expectImportReportSummary(/0 en erreur/);

      // Non-régression : une application au libellé fourni existe désormais en base.
      const rows = await dbQuery<{ id: string }>(
        `SELECT id FROM "Application" WHERE label = $1`,
        [label],
      );
      expect(rows.length).toBe(1);
      createdId = rows[0]?.id;
    } finally {
      if (createdId) await deleteThrowawayApp(createdId);
    }
  });

  test("ADM-15 - importer un hébergement via un fichier Excel (création)", async ({
    page,
  }) => {
    const ts = Date.now();
    const appId = await createThrowawayApp(`E2E ADM15 ${ts}`);

    try {
      const workbook = await buildSheetWorkbook(
        "Hébergements",
        [
          "ID Hébergement",
          "ID Application",
          "Label d’hébergement",
          "Fournisseur d’hébergement",
          "Site",
          "Plateforme",
        ],
        [["", appId, `E2E-ADM15-HOST-${ts}`, "DTNUM", "RENNES", "PHYSIQUE"]],
      );

      const admin = new AdminPage(page);
      await admin.open();
      await admin.openBatchDataTab();
      await admin.importExcel({
        name: `import-adm15-${ts}.xlsx`,
        mimeType: XLSX_MIME,
        buffer: workbook,
      });

      await admin.expectImportReportSummary(/1 créé\(s\)/);
      await admin.expectImportReportSummary(/0 en erreur/);

      // Non-régression : l'application possède désormais un hébergement.
      const rows = await dbQuery<{ id: string }>(
        `SELECT id FROM "Hosting" WHERE "applicationId" = $1`,
        [appId],
      );
      expect(rows.length).toBeGreaterThanOrEqual(1);
    } finally {
      // La suppression de l'application supprime ses hébergements en cascade.
      await deleteThrowawayApp(appId);
    }
  });

  test("ADM-16 - import refusé hors périmètre pour un administrateur scopé (#1890)", async ({
    page,
    data,
  }) => {
    // L'application QA-SCOPE-ABCD est hors du périmètre de `scope-admin` (scopé TOTO/).
    // On résout son id avec la session admin (fixture `data`) avant de basculer sur l'admin scopé,
    // pour que le test se skippe proprement si le seed QA est absent.
    const app = await data.applicationByLabel("QA-SCOPE-ABCD");
    test.skip(!app, "Fixture QA absente — `pnpm db:seed:qa` requis.");

    const ts = Date.now();
    const attemptedLabel = `E2E-ADM16-${ts}`;
    const originalLabel = app!.label;

    // `switchTo` (pas `loginAs`) : la fixture `data` a déjà connecté `page` en `admin` ; sans
    // `logout()` préalable, `login()` détecte une session active et ne change pas d'utilisateur
    // (#1890 flaky — le test s'exécutait alors avec les droits `admin`).
    await switchTo(page, "scope-admin");

    const workbook = await buildSheetWorkbook(
      "Applications",
      ["Identifiant", "Libellé", "Description"],
      [[app!.id, attemptedLabel, "Tentative de mise à jour hors périmètre"]],
    );

    const admin = new AdminPage(page);
    await admin.open();
    await admin.openBatchDataTab();
    await admin.importExcel({
      name: `import-adm16-${ts}.xlsx`,
      mimeType: XLSX_MIME,
      buffer: workbook,
    });

    // La ligne est refusée (droits insuffisants) et consignée dans le rapport ; rien n'est modifié.
    await admin.expectImportReportSummary(/1 en erreur/);
    await admin.expectImportReportSummary(/0 mis à jour/);
    await admin.expectImportReportContains(/Droits insuffisants/i);

    const rows = await dbQuery<{ label: string }>(
      `SELECT label FROM "Application" WHERE id = $1`,
      [app!.id],
    );
    expect(rows[0]?.label).toBe(originalLabel);
  });

  test("ADM-22 - cycle de vie d'une direction métier", async ({
    page,
    data,
  }) => {
    const ts = Date.now();
    const label = `e2e-adm22-${ts}`;
    const renamedLabel = `e2e-adm22-renamed-${ts}`;
    // Idempotence : repartir d'un état propre si un run précédent a laissé la division.
    await data.removeBusinessDivisionLabel(label);
    await data.removeBusinessDivisionLabel(renamedLabel);

    const admin = new AdminPage(page);
    await admin.open();
    await admin.openBusinessDivisionsTab();
    await admin.createBusinessDivision(label);
    await admin.expectBusinessDivisionRow(label);
    await admin.editBusinessDivision(label, renamedLabel);
    await admin.expectBusinessDivisionRow(renamedLabel);
    await admin.deleteBusinessDivision(renamedLabel);
  });

  test("ADM-23 - rattacher une direction métier à une organisation", async ({
    page,
    data,
  }) => {
    const ts = Date.now();
    const orgPath = `E2E/ADM23/${ts}`;
    const divisionLabel = `e2e-adm23-${ts}`;
    await data.removeBusinessDivisionLabel(divisionLabel);
    const org = await data.createOrganization(orgPath);
    test.skip(!org, "Impossible de créer l'organisation de test");

    const admin = new AdminPage(page);
    await admin.open();
    try {
      await admin.openBusinessDivisionsTab();
      await admin.createBusinessDivision(divisionLabel);

      await admin.openOrganizationsTab();
      await admin.attachBusinessDivisionToOrganization(orgPath, divisionLabel);
      await admin.expectOrganizationBusinessDivision(orgPath, divisionLabel);

      // Détachement : la colonne repasse à « - ».
      await admin.attachBusinessDivisionToOrganization(orgPath, "");
      await admin.expectOrganizationBusinessDivision(orgPath, "-");
    } finally {
      if (org) await data.deleteOrganization(org.id).catch(() => {});
      await data.removeBusinessDivisionLabel(divisionLabel).catch(() => {});
    }
  });
});
