import { test, expect } from "../fixtures/test";
import {
  ChromePage,
  CreateApplicationPage,
  SearchPage,
  ReportsPage,
  ApplicationPage,
  loginAs,
} from "../pom";

/**
 * Non-régression — Accessibilité RGAA (protocole `qa/protocoles/rgaa.md`).
 *
 * Le formulaire vierge et le gabarit global suffisent aux parcours courants. RGA-06 exige
 * la fixture QA-GROUP-PARENT, préparée par le setup E2E habituel ; la configuration RGAA
 * sans provisionnement ne la crée pas. POM strict : zéro sélecteur dans cette spec,
 * tout passe par les méthodes sémantiques des Page Objects.
 *
 * Critères couverts :
 *  - 11.1 : chaque champ possède un intitulé (titre du textarea = libellé visible)
 *  - 12.8 : gestion du focus après navigation SPA (page-title-announcer)
 *  - 12.9 : Tab/Maj+Tab quittent le champ, y compris avec une sélection
 *  - 7.1  : titre de page annoncé correctement après navigation SPA
 *  - 9.1  : un seul titre de niveau 1 par page
 */
test.describe("RGAA — accessibilité", () => {
  // RGA-01 — RGAA 12.9 : Tab sans sélection quitte le champ de description
  test("RGA-01 — Tab sans sélection quitte le champ de description", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    const createApp = new CreateApplicationPage(page);
    await createApp.open();
    await createApp.focusDescriptionAndPressTab();
    await createApp.expectDescriptionTextareaNotFocused();
  });

  for (const shiftKey of [false, true]) {
    test(`RGA-01 — ${shiftKey ? "Maj+Tab" : "Tab"} quitte le champ avec une sélection`, async ({
      page,
    }) => {
      await loginAs(page, "admin");
      const createApp = new CreateApplicationPage(page);
      await createApp.open();
      await createApp.selectDescriptionAndPressTab(shiftKey);
      await createApp.expectDescriptionTextareaNotFocused();
    });
  }

  // RGA-02 — RGAA 11.1 : le textarea Description porte un title égal à son libellé
  test("RGA-02 — le textarea Description porte le title attendu", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    const createApp = new CreateApplicationPage(page);
    await createApp.open();
    await createApp.expectDescriptionTextareaTitle("Description");
  });

  // RGA-03 — RGAA 12.8 : le page-title-announcer reçoit le focus après une navigation SPA
  test("RGA-03 — le page-title-announcer reçoit le focus après navigation SPA", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    const chrome = new ChromePage(page);
    await chrome.open();
    await chrome.navigateViaSpaToSearch();
    await chrome.expectAnnouncerFocused();
  });

  // RGA-04 — RGAA 7.1 : le page-title-announcer contient le titre de la page Catalogue
  test("RGA-04 — le page-title-announcer annonce le titre de la page Catalogue", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    const chrome = new ChromePage(page);
    await chrome.open();
    await chrome.navigateViaSpaToSearch();
    await chrome.expectAnnouncerText("Recherche d'applications");
  });

  test("RGA-05 — le dialogue de recherche mobile garde et restitue le focus", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    const chrome = new ChromePage(page);
    await chrome.open();
    await chrome.expectMobileSearchFocusCycle();
  });

  test("RGA-06 — les suggestions de relation se sélectionnent au clavier", async ({
    page,
    data,
  }) => {
    const application = await data.applicationByLabel("QA-GROUP-PARENT");
    expect(
      application,
      "La fixture QA-GROUP-PARENT est requise pour la recherche de relations",
    ).not.toBeNull();
    if (!application) throw new Error("Fixture QA-GROUP-PARENT absente");
    const search = new SearchPage(page);
    await search.open();
    await search.filterByRelationTargetKeyboard(
      application.label,
      application.id,
    );
  });

  test("RGA-07 — la recherche des signalements conserve le focus après réponse", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    const reports = new ReportsPage(page);
    await reports.open();
    await reports.expectListLoaded();
    await reports.expectSearchKeepsFocus("RGAA-recherche-sans-resultat");
  });

  for (const width of [1280, 375]) {
    test(`RGA-08 — la pagination garde le focus et annonce la page à ${width} px`, async ({
      page,
    }) => {
      await loginAs(page, "admin");
      await page.setViewportSize({ width, height: 900 });
      const search = new SearchPage(page);
      await search.open();
      await search.expectPaginationKeepsFocus();
    });
  }

  test("RGA-09 — les filtres mobiles restent accessibles sans recouvrir les résultats", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    await page.setViewportSize({ width: 375, height: 900 });
    const search = new SearchPage(page);
    await search.open();
    await search.expectMobileFiltersStayInFlow();
  });

  for (const authenticated of [false, true]) {
    for (const width of [1280, 320]) {
      test(`RGA-10 — ${authenticated ? "raccourci navigation connecté" : "absence de navigation publique"} à ${width} px`, async ({
        page,
      }) => {
        if (authenticated) await loginAs(page, "admin");
        const chrome = new ChromePage(page);
        await chrome.open();
        if (authenticated) await chrome.expectProfileLink();
        else await chrome.expectSignInLink();
        if (authenticated) await chrome.expectNavigationShortcut(width);
        else {
          await page.setViewportSize({ width, height: 900 });
          await chrome.expectPublicNavigationAbsent();
        }
      });
    }
  }

  test("RGA-11 — le plan public et le raccourci contenu conduisent aux pages annoncées", async ({
    page,
  }) => {
    const chrome = new ChromePage(page);
    await chrome.open();
    await chrome.expectSignInLink();
    await chrome.expectPublicSiteMapAndContentShortcut();
  });

  test("RGA-12 — les destinations du plan connecté gardent une navigation cohérente", async ({
    page,
  }, testInfo) => {
    test.setTimeout(180_000);
    await loginAs(page, "admin");
    const chrome = new ChromePage(page);
    await chrome.open();
    await chrome.expectProfileLink();
    const destinations = await chrome.expectConnectedSiteMapDestinations();
    await testInfo.attach("destinations-plan-du-site", {
      body: JSON.stringify(destinations, null, 2),
      contentType: "application/json",
    });
  });

  test("RGA-13 — l'export de fiche conserve le focus après une erreur et un nouvel essai", async ({
    page,
    data,
  }) => {
    const application = await data.applicationByLabel("QA-GROUP-PARENT");
    if (!application) throw new Error("Fixture QA-GROUP-PARENT absente");
    const app = new ApplicationPage(page);
    await app.open(application.id);
    await app.expectProductExportKeepsFocus();
  });

  // RGA-14 — RGAA 9.1 : seul le titre de la vue est un titre de niveau 1, au chargement et après navigation
  test("RGA-14 — chaque page n'expose qu'un titre de niveau 1", async ({
    page,
  }) => {
    await loginAs(page, "admin");
    const chrome = new ChromePage(page);
    await chrome.open();
    await chrome.navigateViaSpaToSearch();
    await chrome.expectSingleLevelOneHeading("Recherche d'applications");
    await chrome.reloadPage();
    await chrome.expectSingleLevelOneHeading("Recherche d'applications");
  });

  // RGA-15 — RGAA 9.1 : au premier chargement d'une fiche, un seul h1 et un annonceur non vide qui n'est pas un titre
  test("RGA-15 — le premier chargement d'une fiche n'expose qu'un titre de niveau 1", async ({
    page,
    data,
  }) => {
    const application = await data.applicationByLabel("QA-GROUP-PARENT");
    if (!application) throw new Error("Fixture QA-GROUP-PARENT absente");
    const app = new ApplicationPage(page);
    await app.open(application.id);
    const chrome = new ChromePage(page);
    await chrome.expectSingleLevelOneHeading(application.label);
    await chrome.expectAnnouncerIsNotAnEmptyHeading();
  });

  // RGA-16 — RGAA 9.1 / 7.1 : après navigation SPA vers une fiche, l'annonceur reprend le titre dynamique
  test("RGA-16 — la navigation vers une fiche annonce son titre sans ajouter de titre de niveau 1", async ({
    page,
    data,
  }) => {
    const application = await data.applicationByLabel("QA-GROUP-PARENT");
    if (!application) throw new Error("Fixture QA-GROUP-PARENT absente");
    const search = new SearchPage(page);
    await search.open();
    await search.searchByLabel(application.label);
    await search.expectSearchApplied(application.label);
    await search.openApplication(application.id, application.label);
    const chrome = new ChromePage(page);
    await chrome.expectAnnouncerFocused();
    await chrome.expectAnnouncerText(
      `Profil d'application : ${application.label}`,
    );
    await chrome.expectAnnouncerIsNotAnEmptyHeading();
    await chrome.expectSingleLevelOneHeading(application.label);
  });
});
