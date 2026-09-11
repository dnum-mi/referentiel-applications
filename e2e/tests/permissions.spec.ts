import { test as base } from "@playwright/test";
import { test, expect } from "../fixtures/test";
import {
  AdminPage,
  ApplicationPage,
  ChromePage,
  HistoryPage,
  MetadataDetailPage,
  UserProfilePage,
  loginAs,
} from "../pom";
import { captureStepScreenshot } from "../support/screenshots";

const USER_EMAIL = "user@example.com";
const ADMIN_WEAK_EMAIL = "admin-weak@example.com";

/**
 * Non-régression — Permissions & rôles (protocole `qa/protocoles/permissions.md`).
 * PRM-01 et PRM-15..18 : login explicite sans datafeature (`user`, `admin-weak`, `user-federated`,
 * `admin`) ; PRM-14 provisionne le rôle via la datafeature puis ouvre un contexte séparé ; les
 * autres l'admin (datafeature) ; POM strict.
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

  // #2529 a fermé `additionalPermissions` (permissions globales déléguables) à une liste FERMÉE
  // qui exclut désormais `AppWrite`/`AppWritePriority` (permissions applicatives, couche 3) : le
  // rôle global reste le bon levier pour PRM-10 (`roleToAppPermissions` donne les deux droits
  // d'écriture applicatifs sans organisation de périmètre), cf. `role-to-permissions.ts`.
  test("PRM-10 - un Contributeur peut éditer une fiche", async ({
    browser,
    data,
  }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const ctx = await browser.newContext();
    try {
      await data.setUserRole(USER_EMAIL, "CONTRIBUTOR");
      const userPage = await ctx.newPage();
      await loginAs(userPage, "user");
      const fiche = new ApplicationPage(userPage);
      // Les workers parallèles (PRM-04/05 sur un autre navigateur) peuvent appeler
      // resetUser au même moment → re-appliquer les permissions avant chaque tentative.
      await expect(async () => {
        await data.setUserRole(USER_EMAIL, "CONTRIBUTOR");
        await fiche.open(app!.id, "tab-infos");
        await fiche.expectInfoEditAvailable();
      }).toPass({ timeout: 45000 });
    } finally {
      await ctx.close();
      await data.resetUser(USER_EMAIL);
    }
  });

  // `AppWrite`/`AppWritePriority` sont désormais uniquement accordables par acteur (couche 3, via
  // le type d'acteur et sa matrice) : un rôle global donne toujours les deux ensemble
  // (`WRITE_APP_PERMISSIONS`). On dissocie donc via un type d'acteur dédié dont on force la
  // matrice à `AppWritePriority: true / AppWrite: false`, puis un acteur portant l'e-mail du
  // compte de test sur l'application — restauré/supprimé en fin de test.
  test("PRM-11 - AppWritePriority dissociée de AppWrite", async ({
    browser,
    data,
  }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const actorTypes = await data.actorTypes();
    const typeId = actorTypes?.[actorTypes.length - 1]?.id;
    test.skip(!typeId, "Aucun type d'acteur disponible");

    const matrix = await data.permsMatrix();
    const original = matrix?.find((entry) => entry.actorTypeId === typeId);
    test.skip(
      !matrix || !original,
      "Type d'acteur introuvable dans la matrice",
    );

    await data.resetUser(USER_EMAIL);
    let actor: { id: string } | null = null;
    const ctx = await browser.newContext();
    try {
      await data.updatePermsMatrix(
        matrix!.map((entry) =>
          entry.actorTypeId === typeId
            ? { ...entry, AppWrite: false, AppWritePriority: true }
            : entry,
        ),
      );
      actor = await data.createActor(app!.id, {
        email: USER_EMAIL,
        firstname: "E2E-PRM11",
        lastname: "Priority",
        actorTypeId: typeId,
      });
      test.skip(!actor, "Impossible de créer l'acteur de test");

      const userPage = await ctx.newPage();
      await loginAs(userPage, "user");
      const fiche = new ApplicationPage(userPage);
      await fiche.open(app!.id, "tab-infos");
      await fiche.openInfoEdit();
      await fiche.expectPriorityFieldEditable();
      await fiche.expectBaseFieldsReadonly();
    } finally {
      await ctx.close();
      if (actor) await data.deleteActor(app!.id, actor.id).catch(() => {});
      if (original) {
        await data.updatePermsMatrix(
          matrix!.map((entry) =>
            entry.actorTypeId === typeId ? original : entry,
          ),
        );
      }
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

  // PRM-14..18 — niveau d'authentification (#1985). La suite tourne en mode `enforce`
  // (docker-compose) : `admin-weak` porte un mode faible, `user-federated` un fournisseur non
  // listé, tous les autres comptes un mode fort. Sans datafeature (login explicite).
  // La rétrogradation ne se distingue d'un simple Visiteur que si `admin-weak` est bien ADMIN
  // en base : on le garantit via la datafeature (session admin sur la page principale), puis on
  // joue la session faible dans un contexte navigateur séparé.
  test("PRM-14 - une session sans authentification forte est rétrogradée", async ({
    browser,
    data,
  }) => {
    const ctx = await browser.newContext();
    try {
      const weakPage = await ctx.newPage();
      await loginAs(weakPage, "admin-weak"); // crée le compte s'il n'existe pas encore
      await data.setUserRole(ADMIN_WEAK_EMAIL, "ADMIN");
      expect((await data.getUser(ADMIN_WEAK_EMAIL))?.role).toBe("ADMIN");

      await weakPage.reload();
      const chrome = new ChromePage(weakPage);
      await chrome.expectWeakAuthBanner(/utilisateur standard/);
      await chrome.expectNoAdminLink();
      const admin = new AdminPage(weakPage);
      await admin.goToAdministration();
      await admin.expectAccessDenied();
    } finally {
      await ctx.close();
    }
  });

  base(
    "PRM-15 - le profil signale la session limitée et bloque la création de jeton",
    async ({ page }) => {
      await loginAs(page, "admin-weak");
      const profile = new UserProfilePage(page);
      await profile.open();
      await profile.expectAuthLevelLimited();
      await profile.openTokensTab();
      await profile.expectTokenCreationDisabled();
    },
  );

  // PRM-16/19 — reconnexion forte en deux temps. Le compte `admin-weak` porte un mode statique :
  // chaque reconnexion reste faible, ce qui permet de jouer la bascule `prompt` → `logout`.
  base(
    "PRM-16 - une reconnexion restée faible propose la déconnexion complète",
    async ({ page }) => {
      await loginAs(page, "admin-weak");
      const chrome = new ChromePage(page);
      await chrome.expectWeakAuthBanner();
      await chrome.expectReauthButtonLabel("Se reconnecter");
      await chrome.clickReauth();
      await chrome.submitIdentityProviderLogin("admin-weak", "pass");
      await chrome.expectWeakAuthBanner(/n'a pas été reconnue comme forte/);
      await page.reload();
      await chrome.expectWeakAuthBanner(/n'a pas été reconnue comme forte/);
      await chrome.expectReauthButtonLabel(
        "Se déconnecter puis se reconnecter",
      );
    },
  );

  base(
    "PRM-19 - la reconnexion par déconnexion ferme la session SSO et relance la connexion",
    async ({ page }) => {
      await loginAs(page, "admin-weak");
      const chrome = new ChromePage(page);
      await chrome.clickReauth();
      await chrome.submitIdentityProviderLogin("admin-weak", "pass");
      await chrome.expectReauthButtonLabel(
        "Se déconnecter puis se reconnecter",
      );
      await chrome.clickReauthViaLogout();
      await chrome.submitIdentityProviderLogin("admin-weak", "pass");
      await chrome.expectWeakAuthBanner(/toujours sans authentification forte/);
      await page.reload();
      await chrome.expectWeakAuthBanner(/toujours sans authentification forte/);
      await chrome.expectWeakAuthBanner(/contactez le support/);
    },
  );

  base(
    "PRM-17 - une session forte n'affiche pas le bandeau",
    async ({ page }) => {
      await loginAs(page, "admin");
      const chrome = new ChromePage(page);
      await chrome.expectAdminLink(); // preuve que /users/me est chargé
      await chrome.expectNoWeakAuthBanner();
      const admin = new AdminPage(page);
      await admin.open();
      await admin.expectLoaded();
    },
  );

  base(
    "PRM-18 - un mode absent avec un fournisseur non listé conserve la reconnexion",
    async ({ page }) => {
      await loginAs(page, "user-federated");
      const chrome = new ChromePage(page);
      await chrome.expectWeakAuthBanner(/non transmis par le fournisseur/);
      await chrome.expectReauthButtonLabel("Se reconnecter");
    },
  );
});
