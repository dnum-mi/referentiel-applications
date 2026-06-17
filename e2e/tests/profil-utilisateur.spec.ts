import { expect, test } from "../fixtures/test";
import { ApplicationPage, UserProfilePage } from "../pom";

test.describe("Profil utilisateur", () => {
  test("PRF-01 - accéder à la page profil et vérifier les informations", async ({
    page,
    data,
  }) => {
    const profile = new UserProfilePage(page);
    await profile.open();
    await profile.expectProfileInfos();

    const me = await data.currentUser();
    test.skip(!me, "Impossible de récupérer l'utilisateur courant");
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
    test.skip(!app, "Aucune application dans le jeu de données");
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
    test.skip(!app, "Aucune application dans le jeu de données");
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
    test.skip(!app, "Aucune application dans le jeu de données");
    await data.subscribe(app!.id);

    try {
      const profile = new UserProfilePage(page);
      await profile.open();
      await profile.openFollowTab();

      const label = await profile.firstFollowedAppLabel();
      test.skip(!label, "Aucune application suivie visible");

      await profile.clickFirstFollowedApp();

      const fiche = new ApplicationPage(page);
      await fiche.expectLoaded();

      await profile.open();
      await profile.expectProfileInfos();
    } finally {
      await data.unsubscribe(app!.id);
    }
  });
});
