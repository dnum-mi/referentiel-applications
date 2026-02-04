import { expect, test, type Locator, type Page } from "@playwright/test";
import { BASE_URL, login } from "./utils";

function uniqueText(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function openSearchAndOpenGlobalReportModal(page: Page) {
  await login(page);
  await page.goto(`${BASE_URL}/recherche-application`);
  await expect(page.getByTestId("application-search-title")).toBeVisible();
  const reportButton = page.getByTestId("report-missing-app");
  await expect(reportButton).toBeEnabled({ timeout: 20000 });
  await reportButton.click();
  await expect(page.getByTestId("report-anomaly-modal")).toBeVisible();
}

async function submitGlobalReport(page: Page, description: string) {
  await page.getByTestId("report-anomaly-description").fill(description);
  const createReport = page.waitForResponse(
    (response) => response.url().includes("/api/v2/anomaly-notifications") && response.request().method() === "POST",
  );
  await page.getByTestId("report-anomaly-submit-btn").click();
  return createReport;
}

async function createGlobalReport(page: Page, descriptionPrefix: string) {
  await openSearchAndOpenGlobalReportModal(page);
  const description = uniqueText(descriptionPrefix);

  const createResponse = await submitGlobalReport(page, description);
  expect(createResponse.status()).toBe(201);

  await expect(page.getByTestId("report-anomaly-modal")).toBeHidden();
  await expect(page.getByTestId("app-toaster")).toContainText("Merci pour votre signalement !");

  return description;
}

async function openFirstApplicationFromSearch(page: Page) {
  await login(page);
  await page.goto(`${BASE_URL}/recherche-application`);
  await expect(page.getByTestId("application-search-title")).toBeVisible();

  const appLink = page.locator('a[href^="/applications/"]:not([href="/applications/creer"])').first();
  await expect(appLink).toBeVisible();
  await appLink.click();

  await expect(page.getByTestId("application-title")).toBeVisible();
}

async function openHistoryTabAndSubmitCorrection(page: Page, description: string) {
  await page.getByRole("tab", { name: "Historique" }).click();
  await expect(page.getByTestId("notifications-report-issue")).toBeVisible();
  await page.getByTestId("report-issue-textarea").fill(description);
  const createCorrection = page.waitForResponse(
    (response) => response.url().includes("/api/v2/anomaly-notifications") && response.request().method() === "POST",
  );
  await page.getByTestId("report-issue-submit-btn").click();
  return createCorrection;
}

async function openAllReportsTab(page: Page) {
  await login(page);
  await page.goto(`${BASE_URL}/signalements`);
  await expect(page.getByTestId("issue-page-title")).toBeVisible();
  await page.getByRole("tab", { name: "Tous les Signalements" }).click();
  const panel = page.getByTestId("issues-tab-content-tab-all-issues");
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("searchbox", { name: "Rechercher un report" })).toBeVisible();
  return panel;
}

function findIssueRowByDescription(scope: Locator, description: string) {
  return scope.locator("tbody tr", { hasText: description }).first();
}

test.describe("Application Anomaly flow", () => {
  test.describe.configure({ mode: "serial" });

  test("RI-01 — Afficher le formulaire de déclaration", async ({ page }) => {
    await openSearchAndOpenGlobalReportModal(page);

    await expect(page.getByTestId("report-anomaly-description")).toBeVisible();
    await expect(page.getByTestId("report-anomaly-submit-btn")).toBeVisible();
  });

  test("RI-02 — Valider les champs obligatoires", async ({ page }) => {
    await openSearchAndOpenGlobalReportModal(page);

    await page.getByTestId("report-anomaly-submit-btn").click();

    await expect(page.getByText("Veuillez décrire votre signalement.")).toBeVisible();
    await expect(page.getByTestId("report-anomaly-modal")).toBeVisible();
  });

  test("RI-03 — Créer la demande et afficher un feedback de succès", async ({ page }) => {
    await createGlobalReport(page, "RI03-global-report");
  });

  test("RI-04 — Afficher une erreur si la création échoue", async ({ page }) => {
    await openSearchAndOpenGlobalReportModal(page);
    const description = uniqueText("RI04-global-report-failed");

    await page.evaluate(() => {
      const stores = [localStorage, sessionStorage];
      for (const storage of stores) {
        const keys = Object.keys(storage);
        for (const key of keys) {
          if (!key.startsWith("oidc.user:")) continue;
          const raw = storage.getItem(key);
          if (!raw) continue;
          const parsed = JSON.parse(raw) as Record<string, unknown>;
          parsed.access_token = "";
          storage.setItem(key, JSON.stringify(parsed));
        }
      }
    });

    const failedCreate = await submitGlobalReport(page, description);
    expect(failedCreate.status()).toBeGreaterThanOrEqual(400);

    await expect(page.getByTestId("app-toaster")).toContainText("Une erreur est survenue lors de l'envoi du signalement");
  });

  test("RI-05 — Signaler une anomalie depuis une fiche application", async ({ page }) => {
    await openFirstApplicationFromSearch(page);
    const correctionDescription = uniqueText("RI05-app-correction");

    const createResponse = await openHistoryTabAndSubmitCorrection(page, correctionDescription);
    expect(createResponse.status()).toBe(201);

    await expect(page.getByTestId("app-toaster")).toContainText("Votre proposition sera prise en compte prochainement.");
  });

  test("RI-06 — Modifier le statut d'un signalement depuis la liste", async ({ page }) => {
    const globalReportDescription = await createGlobalReport(page, "RI06-global-report");

    const panel = await openAllReportsTab(page);
    const searchInput = panel.getByRole("searchbox", { name: "Rechercher un report" });
    await searchInput.fill(globalReportDescription);
    await panel.getByRole("button", { name: "Rechercher" }).click();

    const row = findIssueRowByDescription(panel, globalReportDescription);
    await expect(row).toBeVisible();

    await panel.getByRole("button", { name: "Modifier" }).click();
    const statusSelect = row.locator("select").first();
    await expect(statusSelect).toBeVisible();

    const patchResponse = page.waitForResponse(
      (response) =>
        /\/api\/v2\/anomaly-notifications\/[^/]+/.test(response.url()) &&
        response.request().method() === "PATCH" &&
        response.status() === 200,
    );
    await statusSelect.selectOption("in_progress");
    await patchResponse;

    await panel.getByRole("button", { name: "Arreter de modifier" }).click();
    await expect(row).toContainText("En cours");
  });
});
