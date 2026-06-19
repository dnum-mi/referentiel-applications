import { test, expect } from "../fixtures/test";
import { DataFeature } from "../fixtures/datafeature";
import { AdminPage, loginAs } from "../pom";
import { captureStepScreenshot } from "../support/screenshots";

const ADMIN_EMAIL = "admin@example.com";
const USER_EMAIL = "user@example.com";

/**
 * Non-régression — Impersonation (#1764). Fonctionnalité **sensible** : un administrateur peut se
 * faire passer pour un autre utilisateur. On couvre le cycle UI (impersonner, bascule d'identité,
 * arrêt, persistance) ET les garde-fous serveur (réservé aux admins, pas de bot, pas de chaînage,
 * traçabilité en base).
 * Utilisateurs Keycloak : `admin` (ADMIN, `admin@example.com`) et `user` (READER, `user@example.com`),
 * mot de passe `pass`. Page admin : `/administration`.
 */
test.describe("Impersonation", () => {
  test.afterEach(async ({ page }, testInfo) => {
    await captureStepScreenshot(page, testInfo);
  });

  test("IMP-01 - un admin impersonne un utilisateur puis arrête", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    const admin = new AdminPage(page);
    await admin.open();

    // Démarre l'impersonation : l'app se recharge sous l'identité de l'utilisateur cible.
    await admin.impersonateUser(USER_EMAIL);
    await admin.expectImpersonationBanner(USER_EMAIL);

    // Sous l'identité d'un lecteur, l'accès à l'administration est refusé : preuve que
    // l'identité (et les droits) ont bien basculé côté serveur.
    await admin.goToAdministration();
    await admin.expectAccessDenied();

    // Arrête l'impersonation : retour à l'identité administrateur.
    await admin.stopImpersonation();
    await admin.expectNotImpersonating();

    // L'admin retrouve l'accès au panneau d'administration.
    await admin.open();
    await admin.expectLoaded();
  });

  test("IMP-02 - un admin ne peut pas s'impersonner lui-même", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    const admin = new AdminPage(page);
    await admin.open();

    // La ligne de l'administrateur connecté n'expose pas le bouton « Se connecter en tant que ».
    await admin.expectImpersonateUnavailable(ADMIN_EMAIL);
  });

  test("IMP-03 - l'impersonation survit à un rechargement", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    const admin = new AdminPage(page);
    await admin.open();

    await admin.impersonateUser(USER_EMAIL);
    await admin.expectImpersonationBanner(USER_EMAIL);

    // Le bandeau reste affiché après un rechargement complet (état persisté).
    await admin.expectImpersonationPersistsAfterReload(USER_EMAIL);

    // Restauration : on arrête l'impersonation pour ne pas laisser d'état entre les tests.
    await admin.stopImpersonation();
    await admin.expectNotImpersonating();
  });

  test("IMP-04 - un non-admin ne peut pas impersonner (403)", async ({
    browser,
    data,
  }) => {
    const target = await data.getUser(USER_EMAIL);
    test.skip(!target, "Utilisateur cible introuvable dans le jeu de données");

    // Session Lecteur dans un contexte séparé (pas d'interférence avec la session admin).
    const ctx = await browser.newContext();
    try {
      const userPage = await ctx.newPage();
      await loginAs(userPage, "user");
      const reader = await DataFeature.forPage(userPage);
      expect(await reader.impersonateStatus(target!.id)).toBe(403);
    } finally {
      await ctx.close();
    }
  });

  test("IMP-05 - la session d'impersonation est tracée en base (audit)", async ({
    page,
    data,
  }) => {
    await loginAs(page, "admin");
    const admin = new AdminPage(page);
    await admin.open();

    await admin.impersonateUser(USER_EMAIL);
    await admin.expectImpersonationBanner(USER_EMAIL);

    // À l'ouverture : une entrée d'audit existe, encore ouverte (endedAt null).
    const opened = await data.latestImpersonationLog(USER_EMAIL);
    expect(opened?.startedAt).toBeTruthy();
    expect(opened?.endedAt).toBeNull();

    await admin.stopImpersonation();
    await admin.expectNotImpersonating();

    // À l'arrêt : la même entrée est clôturée (endedAt renseigné).
    const closed = await data.latestImpersonationLog(USER_EMAIL);
    expect(closed?.endedAt).toBeTruthy();
  });

  test("IMP-06 - impossible d'impersonner un compte de service (400)", async ({
    data,
  }) => {
    // On réutilise un bot existant, sinon on en crée un via l'API token (nettoyé en finally).
    let botId = await data.findBotUserId();
    let createdTokenId: string | null = null;
    if (!botId) {
      createdTokenId = await data.createServiceToken(
        `e2e-imp-bot-${Date.now()}`,
      );
      botId = await data.findBotUserId();
    }
    test.skip(!botId, "Impossible d'obtenir un compte de service (bot)");

    try {
      expect(await data.impersonateStatus(botId!)).toBe(400);
    } finally {
      if (createdTokenId) await data.revokeToken(createdTokenId);
    }
  });

  test("IMP-07 - pas d'impersonation en chaîne (403)", async ({ data }) => {
    const reader = await data.getUser(USER_EMAIL);
    const admin = await data.getUser(ADMIN_EMAIL);
    test.skip(!reader || !admin, "Comptes admin/lecteur introuvables");

    // Déjà en train d'impersonner le lecteur (header), tenter d'impersonner un autre compte :
    // l'identité effective (lecteur) n'a pas le droit d'administration → refus.
    expect(
      await data.impersonateStatus(admin!.id, {
        impersonateUserId: reader!.id,
      }),
    ).toBe(403);
  });
});
