import { test } from "../fixtures/test";
import { ChromePage, CreateApplicationPage, loginAs } from "../pom";

/**
 * Non-régression — Accessibilité RGAA (protocole `qa/protocoles/rgaa.md`).
 *
 * Aucun provisionnement de données requis : le formulaire de création vierge et le chrome global
 * suffisent. Session admin dans tous les cas (route protégée). POM strict : zéro sélecteur dans
 * cette spec, tout passe par les méthodes sémantiques des Page Objects.
 *
 * Critères couverts :
 *  - 11.1 : chaque champ possède un intitulé (titre du textarea = libellé visible)
 *  - 12.8 : gestion du focus après navigation SPA (page-title-announcer)
 *  - 12.9 : Tab sans sélection quitte le champ (comportement natif préservé)
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
});
