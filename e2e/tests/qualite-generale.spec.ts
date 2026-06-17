import { test } from "../fixtures/test";
import { HistoryPage, QualityPage, TimePage } from "../pom";

test.describe("Qualité générale & tableaux de bord", () => {
  test("QUA-01 - charger la page qualité générale", async ({ page }) => {
    const quality = new QualityPage(page);
    await quality.open();
    await quality.expectTitle();
    await quality.expectGlobalStats();
  });

  test("QUA-02 - graphique de répartition IQ par tranche", async ({ page }) => {
    const quality = new QualityPage(page);
    await quality.open();
    await quality.expectIqChart();
  });

  test("QUA-03 - courbe de tendance IQ avec filtres", async ({ page }) => {
    const quality = new QualityPage(page);
    await quality.open();
    await quality.expectIqTrendChart();
    await quality.expectNoIqTrendError();
  });

  test("QUA-04 - bascule graphique / tableau sur la répartition IQ", async ({
    page,
  }) => {
    const quality = new QualityPage(page);
    await quality.open();
    await quality.expectIqChart();
    await quality.toggleIqChartView();
    await quality.expectIqChartTableVisible();
    await quality.toggleIqChartView();
    await quality.expectIqChartCanvasVisible();
  });

  test("QUA-05 - charger le diagramme TIME", async ({ page }) => {
    const time = new TimePage(page);
    await time.open();
    await time.expectTitle();
    await time.expectChartSection();
    await time.expectFilters();
  });

  test("QUA-06 - charger l'historique des modifications", async ({ page }) => {
    const history = new HistoryPage(page);
    await history.open();
    await history.expectFiltersVisible();
    await history.expectTableOrEmpty();
  });

  test("QUA-07 - filtrer l'historique par plage de dates", async ({ page }) => {
    const history = new HistoryPage(page);
    await history.open();
    await history.expectFiltersVisible();
    await history.applyFilters();
    await history.expectTableOrEmpty();
    await history.clearFilters();
    await history.expectTableOrEmpty();
  });
});
