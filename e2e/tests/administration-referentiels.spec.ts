import { expect, test } from "../fixtures/test";
import { AdminPage } from "../pom";
import { buildActorImportWorkbook } from "../support/actor-import-xlsx";
import { dbQuery } from "../support/db";

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
      await admin.importActorsFromExcel({
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
      await admin.importActorsFromExcel({
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
      await admin.importActorsFromExcel({
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
});
