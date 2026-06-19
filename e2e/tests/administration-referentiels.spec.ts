import { test } from "../fixtures/test";
import { AdminPage } from "../pom";

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
});
