import { test, expect } from "../fixtures/test";
import {
  ChromePage,
  CreateApplicationPage,
  SearchPage,
  ReportsPage,
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
});
