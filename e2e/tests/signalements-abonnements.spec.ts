import { test } from "../fixtures/test";
import {
  ApplicationPage,
  ReportsPage,
  SearchPage,
  UserProfilePage,
  loginAs,
} from "../pom";
import { Mailpit } from "../support/mailpit";

/**
 * Non-régression — Signalements & abonnements (protocole `qa/protocoles/signalements-abonnements.md`).
 * POM strict : la logique d'abonnement (bouton sans testid) est encapsulée dans `ApplicationPage`.
 */
test.describe("Signalements & abonnements", () => {
  test("SIG-03 - liste des signalements (mes / tous)", async ({ page }) => {
    await loginAs(page, "admin");
    const reports = new ReportsPage(page);
    await reports.open();
    await reports.expectListLoaded();
  });

  test("SIG-06 - s'abonner à une application", async ({ page, data }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id);
    await fiche.unsubscribe(); // état de départ déterministe
    await fiche.subscribe();
    await fiche.expectSubscribed();
  });

  test("SIG-07 - se désabonner depuis le profil", async ({ page, data }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    // Garantit au moins un abonnement, puis se désabonne depuis le profil.
    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id);
    await fiche.subscribe();

    const profile = new UserProfilePage(page);
    await profile.open();
    await profile.openFollowTab();
    await profile.unsubscribeFirst();
  });

  test("SIG-08 - onglet abonnements du profil", async ({ page }) => {
    await loginAs(page, "admin");
    const profile = new UserProfilePage(page);
    await profile.open();
    await profile.openFollowTab();
    await profile.expectFollowTabLoaded();
  });

  test("SIG-01 - soumettre un signalement global", async ({ page, data }) => {
    test.skip(
      !(await data.firstApplication()),
      "Aucune application dans le jeu de données",
    );

    const search = new SearchPage(page);
    await search.open();
    await search.submitGlobalReport(`SIG-01 ${Date.now()}`);
  });

  test("SIG-02 - soumettre un signalement depuis une application", async ({
    page,
    data,
  }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");

    const fiche = new ApplicationPage(page);
    await fiche.open(app!.id, "tab-reports");
    await fiche.submitReportFromApp(`SIG-02 ${Date.now()}`);
  });

  test("SIG-04 - recherche dans les signalements", async ({ page, data }) => {
    test.skip(
      !(await data.firstApplication()),
      "Aucune application dans le jeu de données",
    );
    const term = `SIG-04 ${Date.now()}`;

    const search = new SearchPage(page);
    await search.open();
    await search.submitGlobalReport(term); // garantit un signalement recherchable

    const reports = new ReportsPage(page);
    await reports.open();
    await reports.search(term);
    await reports.expectRowContaining(term);
  });

  test("SIG-05 - gérer un signalement (changement de statut)", async ({
    page,
    data,
  }) => {
    test.skip(
      !(await data.firstApplication()),
      "Aucune application dans le jeu de données",
    );
    const term = `SIG-05 ${Date.now()}`;

    const search = new SearchPage(page);
    await search.open();
    await search.submitGlobalReport(term);

    const reports = new ReportsPage(page);
    await reports.open();
    await reports.search(term);
    await reports.expectRowContaining(term);
    await reports.enterEditMode();
    await reports.changeFirstReportStatus();
  });

  test("SIG-09 - préférence de notifications email", async ({ page }) => {
    await loginAs(page, "admin");
    const profile = new UserProfilePage(page);
    await profile.open();
    await profile.toggleEmailNotificationsAndRestore();
  });

  test("SIG-10 - notification email à la modification (Mailpit)", async ({
    page,
    data,
  }) => {
    const app = await data.firstApplication();
    test.skip(!app, "Aucune application dans le jeu de données");
    const me = await data.currentUser();
    test.skip(!me?.email, "Email de l'utilisateur courant introuvable");

    const mailpit = new Mailpit(page);
    try {
      await data.enableEmailNotifications();
      await data.subscribe(app!.id);
      await mailpit.clear();
      // Une modification crée une entrée d'audit ; le digest (déclenché pour aujourd'hui) la notifie.
      await data.modifyApplication(app!.id, {
        description: `SIG-10 ${Date.now()}`,
      });
      await data.triggerDigest("today");
      await mailpit.expectMessageTo(me!.email);
    } finally {
      await data.unsubscribe(app!.id);
    }
  });
});
