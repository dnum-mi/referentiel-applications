import { expect, test } from "../fixtures/test";
import { ApplicationPage, loginAs, UserProfilePage } from "../pom";

test.describe("Profil utilisateur", () => {
  test("PRF-01 - accéder à la page profil et vérifier les informations", async ({
    page,
    data,
  }) => {
    const profile = new UserProfilePage(page);
    await profile.open();
    await profile.expectProfileInfos();

    const me = await data.currentUser();
    expect(me, "Impossible de récupérer l'utilisateur courant").toBeTruthy();
    const displayedEmail = await profile.profileEmail();
    expect(displayedEmail).toBe(me!.email);
  });

  test("PRF-02 - activer / désactiver les notifications email", async ({
    page,
    data,
  }) => {
    void data;
    const profile = new UserProfilePage(page);
    await profile.open();
    await profile.toggleEmailNotificationsAndRestore();
  });

  test("PRF-03 - lister les applications suivies", async ({ page, data }) => {
    const app = await data.firstApplication();
    expect(app, "Aucune application dans le jeu de données").toBeTruthy();
    await data.subscribe(app!.id);

    try {
      const profile = new UserProfilePage(page);
      await profile.open();
      await profile.openFollowTab();
      await profile.expectFollowedAppsTable();
      expect(await profile.followedAppCount()).toBeGreaterThan(0);
    } finally {
      await data.unsubscribe(app!.id);
    }
  });

  test("PRF-04 - se désabonner d'une application depuis le profil", async ({
    page,
    data,
  }) => {
    const app = await data.firstApplication();
    expect(app, "Aucune application dans le jeu de données").toBeTruthy();
    await data.subscribe(app!.id);

    const profile = new UserProfilePage(page);
    await profile.open();
    await profile.openFollowTab();
    await profile.unsubscribeFirst();

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id);
    await expect
      .poll(() => fiche.isSubscribed(), { timeout: 10000 })
      .toBe(false);
  });

  test("PRF-05 - onglet Tokens API (présence)", async ({ page, data }) => {
    void data;
    const profile = new UserProfilePage(page);
    await profile.open();
    await profile.openTokensTab();
    await profile.expectTokensTabLoaded();
  });

  test("PRF-06 - navigation aller-retour profil / fiche application", async ({
    page,
    data,
  }) => {
    const app = await data.firstApplication();
    expect(app, "Aucune application dans le jeu de données").toBeTruthy();
    await data.subscribe(app!.id);

    try {
      const profile = new UserProfilePage(page);
      await profile.open();
      await profile.openFollowTab();

      const label = await profile.firstFollowedAppLabel();
      expect(label, "Aucune application suivie visible").toBeTruthy();

      await profile.clickFirstFollowedApp();

      const fiche = new ApplicationPage(page);
      await fiche.expectLoaded();

      await profile.open();
      await profile.expectProfileInfos();
    } finally {
      await data.unsubscribe(app!.id);
    }
  });

  test("PRF-07 - un non-admin voit l'administrateur à contacter", async ({
    page,
  }) => {
    // `member-toto` : compte non admin du seed QA (organisation TOTO) → l'admin scopé le plus
    // proche est `scope-admin` (périmètre TOTO).
    await loginAs(page, "member-toto");
    const profile = new UserProfilePage(page);
    await profile.open();
    await profile.expectContactAdmin();
    await profile.expectContactAdminSource("administrateur de votre périmètre");
    expect(await profile.contactAdminEmail()).toBe("scope-admin@example.com");
  });

  test("PRF-08 - un administrateur global ne voit pas la ligne administrateur", async ({
    page,
    data,
  }) => {
    void data;
    const profile = new UserProfilePage(page);
    await profile.open();
    await profile.expectNoContactAdmin();
  });

  test("PRF-09 - un admin scopé voit un autre administrateur à contacter", async ({
    page,
  }) => {
    // `scope-admin` (périmètre TOTO) ne doit pas se voir lui-même : admin scopé plus proche
    // autre que lui, sinon admin global.
    await loginAs(page, "scope-admin");
    const profile = new UserProfilePage(page);
    await profile.open();
    await profile.expectContactAdmin();
    expect(await profile.contactAdminEmail()).not.toBe(
      "scope-admin@example.com",
    );
  });
});
