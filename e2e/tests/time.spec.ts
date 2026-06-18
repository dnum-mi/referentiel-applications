import { test } from "../fixtures/test";
import { SearchPage, TimePage } from "../pom";

/**
 * Non-régression — Diagramme Time (protocole `qa/protocoles/time.md`). POM strict : `TimePage`.
 * Dataviz D3 : assertions stables (présence du SVG ou état vide). La fixture `data` connecte `admin`
 * (la page requiert l'authentification). La sidebar de `/time` est le composant partagé du catalogue.
 */
test.describe("Diagramme Time", () => {
  test("TIM-01 - la page Diagramme Time se charge", async ({ page, data }) => {
    void data;
    const time = new TimePage(page);
    await time.open();
    await time.expectLoaded();
  });

  test("TIM-02 - le nuage de points ou l'état vide s'affiche", async ({
    page,
    data,
  }) => {
    void data;
    const time = new TimePage(page);
    await time.open();
    await time.expectChartOrEmpty();
  });

  test("TIM-03 - la sidebar de filtres est présente", async ({
    page,
    data,
  }) => {
    void data;
    const time = new TimePage(page);
    await time.open();
    await time.expectFiltersPresent();
  });

  test("TIM-04 - filtrer par Qualité recharge le diagramme et reflète iqGte/iqLte", async ({
    page,
    data,
  }) => {
    void data;
    const time = new TimePage(page);
    await time.open();
    // La sidebar est le composant partagé du catalogue → on réutilise son interaction (POM strict).
    await new SearchPage(page).filterByQualityRange(30, 70);
    await time.expectChartOrEmpty();
  });
});
