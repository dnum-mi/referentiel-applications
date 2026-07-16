import { test as base } from "@playwright/test";
import { test, expect } from "../fixtures/test";
import {
  AdminPage,
  ApplicationPage,
  HistoryPage,
  MetadataDetailPage,
  loginAs,
} from "../pom";
import { captureStepScreenshot } from "../support/screenshots";

const USER_EMAIL = "user@example.com";

/**
 * Non-régression — Permissions & rôles (protocole `qa/protocoles/permissions.md`).
 * PRM-01 utilise le rôle `user` (sans datafeature) ; les autres l'admin (datafeature) ; POM strict.
 */
test.describe("Permissions & rôles", () => {
  base.afterEach(async ({ page }, testInfo) => {
    await captureStepScreenshot(page, testInfo);
  });

  // PRM-01 — rôle Lecteur : pas de datafeature, login explicite en `user`.
  base(
    "PRM-01 - un non-admin ne peut pas accéder à l'administration",
    async ({ page }) => {
      await loginAs(page, "user");
      const admin = new AdminPage(page);
      await admin.goToAdministration();
      await admin.expectAccessDenied();
    },
  );

  test("PRM-02 - l'admin accède au panneau d'administration", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    const admin = new AdminPage(page);
    await admin.open();
    await admin.expectLoaded();
  });

  test("PRM-06 - matrice de permissions par type d'acteur", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    const admin = new AdminPage(page);
    await admin.open();
    await admin.openPermsMatrixTab();
    await admin.expectPermsMatrixEditable();
  });

  test("PRM-08 - droits contextuels via type d'acteur (my-perms)", async ({
    page,
    data,
  }) => {
    const app = await data.applicationWithMyPerms();
    test.skip(
      !app,
      "Aucune application avec droits contextuels (my-perms) pour cet utilisateur",
    );

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id);
    await fiche.expectLoaded();
  });

  test("PRM-03 - liste et recherche des utilisateurs", async ({ page }) => {
    await loginAs(page, "admin");
    const admin = new AdminPage(page);
    await admin.open();
    await admin.expectUserRow(USER_EMAIL);
  });

  test("PRM-04 - édition du rôle d'un utilisateur", async ({ page, data }) => {
    const admin = new AdminPage(page);
    try {
      // Le flux édition (modal DSFR) peut subir un re-render transitoire sous charge :
      // on ré-ouvre + ré-enregistre jusqu'au succès plutôt que de flaker.
      await expect(async () => {
        await admin.open();
        await admin.openEditUser(USER_EMAIL);
        await admin.changeRoleAndSave();
      }).toPass({ timeout: 45000 });
    } finally {
      await data.resetUser(USER_EMAIL); // rétablit le Lecteur
    }
  });

  test("PRM-05 - permissions individuelles additionnelles", async ({
    page,
    data,
  }) => {
    const admin = new AdminPage(page);
    try {
      await expect(async () => {
        await admin.open();
        await admin.openEditUser(USER_EMAIL);
        await admin.toggleAdditionalPermissionAndSave();
      }).toPass({ timeout: 45000 });
    } finally {
      await data.resetUser(USER_EMAIL);
    }
  });

  test("PRM-07 - modifier et enregistrer la matrice de permissions", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    const admin = new AdminPage(page);
    await admin.open();
    await admin.openPermsMatrixTab();
    await admin.editMatrixAndRestore();
  });

  // PRM-09/10 utilisent un CONTEXTE navigateur séparé pour la session `user` : le provisioning se
  // fait avec l'admin (datafeature) sur la page principale, sans interférence du SSO Keycloak.
  test("PRM-09 - un Lecteur ne voit pas les actions d'écriture", async ({
    browser,
    data,
  }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");
    await data.resetUser(USER_EMAIL); // garantit le rôle Lecteur

    const ctx = await browser.newContext();
    try {
      const userPage = await ctx.newPage();
      await loginAs(userPage, "user");
      const fiche = new ApplicationPage(userPage);
      await fiche.open(app!.id, "tab-infos");
      await fiche.expectInfoEditDisabled();
    } finally {
      await ctx.close();
    }
  });

  test("PRM-10 - un Contributeur peut éditer une fiche", async ({
    browser,
    data,
  }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const ctx = await browser.newContext();
    try {
      await data.setUserAdditionalPermissions(USER_EMAIL, ["AppWrite"]);
      const userPage = await ctx.newPage();
      await loginAs(userPage, "user");
      const fiche = new ApplicationPage(userPage);
      // Les workers parallèles (PRM-04/05 sur un autre navigateur) peuvent appeler
      // resetUser au même moment → re-appliquer les permissions avant chaque tentative.
      await expect(async () => {
        await data.setUserAdditionalPermissions(USER_EMAIL, ["AppWrite"]);
        await fiche.open(app!.id, "tab-infos");
        await fiche.expectInfoEditAvailable();
      }).toPass({ timeout: 45000 });
    } finally {
      await ctx.close();
      await data.resetUser(USER_EMAIL);
    }
  });

  test("PRM-11 - AppWritePriority dissociée de AppWrite", async ({ data }) => {
    try {
      await data.setUserAdditionalPermissions(USER_EMAIL, ["AppWritePriority"]);
      const user = await data.getUser(USER_EMAIL);
      expect(user?.additionalPermissions).toContain("AppWritePriority");
      expect(user?.additionalPermissions).not.toContain("AppWrite");
    } finally {
      await data.resetUser(USER_EMAIL);
    }
  });

  test("PRM-12 - modifier la matrice des droits génère une entrée dans l'historique", async ({
    page,
    data,
  }) => {
    const matrix = await data.permsMatrix();
    test.skip(!matrix || matrix.length === 0, "Matrice des permissions vide");

    const snapshot = structuredClone(matrix!);
    try {
      await loginAs(page, "admin");
      const admin = new AdminPage(page);
      await admin.open();
      await admin.openPermsMatrixTab();
      await admin.editMatrixAndSave();

      const history = new HistoryPage(page);
      await history.open();
      await history.expectHasRows();
      await history.expectFirstRowContains(
        "Modification de la matrice des droits",
      );
      await history.openFirstDetail();

      const detail = new MetadataDetailPage(page);
      await detail.expectDetailLoaded();
      await detail.expectDescriptionContains(
        "Modification de la matrice des droits",
      );
      await detail.expectDescriptionContains("Type d'acteur");
    } finally {
      await data.updatePermsMatrix(snapshot);
    }
  });

  test("PRM-13 - la légende de la matrice des permissions est visible avant la table", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    const admin = new AdminPage(page);
    await admin.open();
    await admin.openPermsMatrixTab();
    await admin.expectPermsMatrixLegendVisible();
  });

  // PRM-14/15 (#2028) — l'administrateur d'une APPLICATION (acteur dont l'ActorType a isAdmin=true)
  // a tous les droits sur SA seule application. Données 100 % jetables et isolées : applications de
  // test + types d'acteur dédiés (sans matrice → droits venant du seul `isAdmin`), nettoyés en
  // `finally`. Le rôle global de `user` reste Lecteur : le seul levier d'écriture est l'acteur.

  test("PRM-14 - un administrateur d'application (acteur isAdmin) peut éditer SA fiche mais pas une autre", async ({
    browser,
    data,
  }) => {
    const stamp = Date.now();
    await data.resetUser(USER_EMAIL); // rôle global restreint (Lecteur)

    const adminType = await data.createActorType({
      code: `E2E-PRM14-${stamp}`,
      label: `E2E App Admin ${stamp}`,
      isAdmin: true,
    });
    const appA = await data.createTestApplication(`E2E-PRM14-A-${stamp}`);
    const appB = await data.createTestApplication(`E2E-PRM14-B-${stamp}`);
    const actor = await data.createActor(appA.id, {
      email: USER_EMAIL,
      actorTypeId: adminType.id,
      firstname: "E2E",
      lastname: "AppAdmin",
      isGroup: false,
    });

    const ctx = await browser.newContext();
    try {
      test.skip(!actor, "Création de l'acteur de test impossible");
      const userPage = await ctx.newPage();
      await loginAs(userPage, "user");
      const fiche = new ApplicationPage(userPage);

      // Sur SA propre application : édition possible (droits complets forcés par `isAdmin`,
      // bien que le type n'ait aucune permission de matrice).
      await fiche.open(appA.id, "tab-infos");
      await fiche.expectInfoEditAvailable();

      // Sur une AUTRE application (où il n'est pas acteur) : édition impossible — les droits
      // d'admin d'application sont bornés à sa seule application.
      await fiche.open(appB.id, "tab-infos");
      await fiche.expectInfoEditDisabled();
    } finally {
      await ctx.close();
      await data.removeApplication(appA.id); // cascade l'acteur
      await data.removeApplication(appB.id);
      await data.deleteActorType(adminType.id);
      await data.resetUser(USER_EMAIL);
    }
  });

  test("PRM-15 - un acteur d'un type NON administrateur ne dispose que des droits de sa matrice", async ({
    browser,
    data,
  }) => {
    const stamp = Date.now();
    await data.resetUser(USER_EMAIL);

    // Type non-admin, sans matrice → aucun droit applicatif (pas de court-circuit `isAdmin`).
    const plainType = await data.createActorType({
      code: `E2E-PRM15-${stamp}`,
      label: `E2E Non Admin ${stamp}`,
      isAdmin: false,
    });
    const app = await data.createTestApplication(`E2E-PRM15-${stamp}`);
    const actor = await data.createActor(app.id, {
      email: USER_EMAIL,
      actorTypeId: plainType.id,
      firstname: "E2E",
      lastname: "NonAdmin",
      isGroup: false,
    });

    const ctx = await browser.newContext();
    try {
      test.skip(!actor, "Création de l'acteur de test impossible");
      const userPage = await ctx.newPage();
      await loginAs(userPage, "user");
      const fiche = new ApplicationPage(userPage);

      // Type non-admin + matrice vide → aucun droit d'écriture sur l'application.
      await fiche.open(app.id, "tab-infos");
      await fiche.expectInfoEditDisabled();
    } finally {
      await ctx.close();
      await data.removeApplication(app.id);
      await data.deleteActorType(plainType.id);
      await data.resetUser(USER_EMAIL);
    }
  });
});
