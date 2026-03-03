import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { BASE_URL, login } from "./utils";

function iqGroupBySelect(page: Page) {
  return page.locator("select[data-testid='iq-chart-groupby-select'], [data-testid='iq-chart-groupby-select'] select").first();
}

function iqStartDateInput(page: Page) {
  return page.locator("input[data-testid='iq-chart-start-date'], [data-testid='iq-chart-start-date'] input").first();
}

function iqEndDateInput(page: Page) {
  return page.locator("input[data-testid='iq-chart-end-date'], [data-testid='iq-chart-end-date'] input").first();
}

async function openQualityPage(page: Page) {
  await login(page);
  await page.goto(`${BASE_URL}/qualite-generale`);
  await expect(page.getByTestId("quality-page")).toBeVisible();
  await expect(page.getByTestId("quality-page-title")).toBeVisible();
}

async function waitQualityDataLoaded(page: Page) {
  await expect(page.getByTestId("global-stats-data")).toBeVisible();
  await expect(page.getByTestId("applications-chart-canvas")).toBeVisible();
  await expect(page.getByTestId("applications-iq-chart-canvas")).toBeVisible();
  await expect(page.getByTestId("iq-chart-canvas")).toBeVisible();
}

async function toggleChartTable(page: Page, toggleTestId: string, tableTestId: string, canvasTestId: string) {
  const toggle = page.getByTestId(toggleTestId);
  const table = page.getByTestId(tableTestId);
  const canvas = page.getByTestId(canvasTestId);

  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(table).toBeVisible();
  await expect(canvas).toBeHidden();

  await toggle.click();
  await expect(canvas).toBeVisible();
}

async function withDelayedStatsRequests(page: Page, delayMs: number) {
  const delayedPatterns = [
    "/api/v2/applications/count-by-month",
    "/api/v2/applications/count-by-iq",
    "/api/v2/stats/iq-avg/period",
    "/api/v2/actors/count",
    "/api/v2/compliances/count",
    "/api/v2/hostings/count",
    "/api/v2/applications?",
  ];

  await page.route("**/api/v2/**", async (route) => {
    const url = route.request().url();
    if (delayedPatterns.some((pattern) => url.includes(pattern))) {
      await page.waitForTimeout(delayMs);
    }
    await route.continue();
  });
}

test.describe("QualityPage e2e", () => {
  test.beforeEach(async ({ page }) => {
    await openQualityPage(page);
  });

  test("QP-01 — Afficher les KPIs quand des données sont disponibles", async ({ page }) => {
    await waitQualityDataLoaded(page);

    for (let i = 0; i < 4; i++) {
      const item = page.getByTestId(`global-stats-item-${i}`);
      await expect(item).toBeVisible();
      await expect(item).toContainText(/\d+/);
    }
  });

  test("QP-02 — Afficher un état de chargement pendant la récupération", async ({ page }) => {
    await withDelayedStatsRequests(page, 700);
    await page.reload();

    const possibleLoaders = [
      page.getByTestId("global-stats-loading"),
      page.getByTestId("applications-chart-loading"),
      page.getByTestId("applications-iq-chart-loading"),
      page.getByTestId("iq-chart-loading"),
    ];

    await expect
      .poll(async () => {
        for (const loader of possibleLoaders) {
          if (await loader.isVisible().catch(() => false)) return true;
        }
        return false;
      })
      .toBeTruthy();

    await waitQualityDataLoaded(page);
  });

  test("QP-03 — Mettre à jour les visuels quand la période change", async ({ page }) => {
    await waitQualityDataLoaded(page);
    await expect(iqGroupBySelect(page)).toBeVisible();

    const weekRequest = page.waitForResponse(
      (response) =>
        response.url().includes("/api/v2/stats/iq-avg/period") &&
        response.request().method() === "GET" &&
        response.url().includes("groupBy=week"),
    );

    await iqGroupBySelect(page).selectOption("week");
    await weekRequest;

    await expect(page.getByTestId("iq-chart-error")).toHaveCount(0);
    await expect(page.getByTestId("iq-chart-canvas")).toBeVisible();
  });

  test("QP-04 — Afficher les graphiques et supporter le survol sans crash", async ({ page }) => {
    await waitQualityDataLoaded(page);

    const pageErrors: Error[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(error);
    });

    const charts = [
      page.getByTestId("applications-chart-canvas"),
      page.getByTestId("applications-iq-chart-canvas"),
      page.getByTestId("iq-chart-canvas"),
    ];

    for (const chart of charts) {
      await expect(chart).toBeVisible();
      await chart.hover();
      await expect(chart).toBeVisible();
    }

    expect(pageErrors).toEqual([]);
  });

  test("QP-05 — Basculer graphique/tableau sur les trois graphiques", async ({ page }) => {
    await waitQualityDataLoaded(page);

    await toggleChartTable(page, "applications-chart-toggle-view", "applications-chart-table", "applications-chart-canvas");
    await toggleChartTable(page, "applications-iq-chart-toggle-view", "applications-iq-chart-table", "applications-iq-chart-canvas");
    await toggleChartTable(page, "iq-chart-toggle-view", "iq-chart-table", "iq-chart-canvas");
  });

  test("QP-06 — Afficher un état vide si aucune donnée pour la période", async ({ page }) => {
    await waitQualityDataLoaded(page);
    await expect(iqStartDateInput(page)).toBeVisible();
    await expect(iqEndDateInput(page)).toBeVisible();
    await expect(iqGroupBySelect(page)).toBeVisible();

    await iqStartDateInput(page).fill("2099-01-01");
    await iqEndDateInput(page).fill("2099-01-31");

    const request = page.waitForResponse(
      (response) =>
        response.url().includes("/api/v2/stats/iq-avg/period") &&
        response.request().method() === "GET" &&
        response.url().includes("groupBy=day"),
    );
    await iqGroupBySelect(page).selectOption("day");
    await request;

    await expect(page.getByTestId("iq-chart-no-data")).toContainText("Aucune donnée disponible pour la période sélectionnée.");
    await expect(page.getByTestId("iq-chart-error")).toHaveCount(0);
  });

  test("QP-07 — Vérifier l’accessibilité (Axe) sans violation critique", async ({ page }) => {
    await waitQualityDataLoaded(page);

    const accessibilityScanResults = await new AxeBuilder({ page }).include("[data-testid='quality-page']").analyze();

    const criticalViolations = accessibilityScanResults.violations.filter((violation) => violation.impact === "critical");
    expect(criticalViolations).toEqual([]);
  });
});
