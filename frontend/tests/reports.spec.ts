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
  await expect(page.getByTestId("report-modal")).toBeVisible();
}

async function submitGlobalReport(page: Page, description: string) {
  await page.getByTestId("report-description").fill(description);
  const createReport = page.waitForResponse(
    (response) => response.url().includes("/api/v2/reports") && response.request().method() === "POST",
  );
  await page.getByTestId("report-submit-btn").click();
  return createReport;
}

async function createGlobalReport(page: Page, descriptionPrefix: string) {
  await openSearchAndOpenGlobalReportModal(page);
  const description = uniqueText(descriptionPrefix);

  const createResponse = await submitGlobalReport(page, description);
  expect(createResponse.status()).toBe(201);

  await expect(page.getByTestId("report-modal")).toBeHidden();
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

async function openReportsTabAndSubmitReport(page: Page, description: string) {
  await page.getByRole("tab", { name: "Signalements" }).click();
  await expect(page.getByTestId("reports-report-issue")).toBeVisible();
  await page.getByTestId("report-issue-textarea").fill(description);
  const createReport = page.waitForResponse((response) => response.url().includes("/reports") && response.request().method() === "POST");
  await page.getByTestId("report-issue-submit-btn").click();
  return createReport;
}

async function openAllReportsTab(page: Page) {
  await login(page);
  await page.goto(`${BASE_URL}/signalements`);
  await expect(page.getByTestId("reports-page-title")).toBeVisible();
  await page.getByRole("tab", { name: "Tous les Signalements" }).click();
  const panel = page.getByTestId("reports-tab-content-tab-all-reports");
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("searchbox", { name: "Rechercher un signalement" })).toBeVisible();
  return panel;
}

function findIssueRowByDescription(scope: Locator, description: string) {
  return scope.locator("tbody tr", { hasText: description }).first();
}

test.describe("Reports flow", () => {
  test.describe.configure({ mode: "serial" });

  test("RI-01 — Afficher le formulaire de déclaration", async ({ page }) => {
    await openSearchAndOpenGlobalReportModal(page);

    await expect(page.getByTestId("report-description")).toBeVisible();
    await expect(page.getByTestId("report-submit-btn")).toBeVisible();
  });

  test("RI-02 — Valider les champs obligatoires", async ({ page }) => {
    await openSearchAndOpenGlobalReportModal(page);

    await page.getByTestId("report-submit-btn").click();

    await expect(page.getByText("Veuillez décrire votre signalement.")).toBeVisible();
    await expect(page.getByTestId("report-modal")).toBeVisible();
  });

  test("RI-03 — Créer la demande et afficher un feedback de succès", async ({ page }) => {
    await createGlobalReport(page, "RI03-global-report");
  });

  test("RI-04 — Ré-authentifie l'utilisateur quand la session est invalide (401)", async ({ page }) => {
    await openSearchAndOpenGlobalReportModal(page);
    const description = uniqueText("RI04-global-report-401");

    // Corrompt le token OIDC stocké → le prochain appel API renverra 401.
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
    expect(failedCreate.status()).toBe(401);

    // Le 401 déclenche une ré-authentification : l'app repasse par OIDC (la session
    // SSO Keycloak étant encore vivante, le retour est transparent) et récupère un
    // token valide. On vérifie ce renouvellement plutôt que l'URL Keycloak, qui
    // n'est que transitoire.
    await page.waitForFunction(
      () => {
        for (const storage of [localStorage, sessionStorage]) {
          for (const key of Object.keys(storage)) {
            if (!key.startsWith("oidc.user:")) continue;
            const raw = storage.getItem(key);
            if (raw && (JSON.parse(raw) as { access_token?: string }).access_token) return true;
          }
        }
        return false;
      },
      { timeout: 15000 },
    );
  });

  test("RI-05 — Signaler depuis une fiche application", async ({ page }) => {
    await openFirstApplicationFromSearch(page);
    const reportDescription = uniqueText("RI05-app-report");

    const createResponse = await openReportsTabAndSubmitReport(page, reportDescription);
    expect(createResponse.status()).toBe(201);

    await expect(page.getByTestId("app-toaster")).toContainText("Votre proposition sera prise en compte prochainement.");
  });

  test("RI-06 — Modifier le statut d'un signalement depuis la liste", async ({ page }) => {
    const globalReportDescription = await createGlobalReport(page, "RI06-global-report");

    const panel = await openAllReportsTab(page);
    const searchInput = panel.getByRole("searchbox", { name: "Rechercher un signalement" });
    await searchInput.fill(globalReportDescription);
    await panel.getByRole("button", { name: "Rechercher" }).click();

    const row = findIssueRowByDescription(panel, globalReportDescription);
    await expect(row).toBeVisible();

    await panel.getByRole("button", { name: "Modifier" }).click();
    const statusSelect = row.locator("select").first();
    await expect(statusSelect).toBeVisible();

    const patchResponse = page.waitForResponse(
      (response) =>
        /\/api\/v2\/reports\/[^/]+/.test(response.url()) && response.request().method() === "PATCH" && response.status() === 200,
    );
    await statusSelect.selectOption("in_progress");
    await patchResponse;

    await panel.getByRole("button", { name: "Arreter de modifier" }).click();
    await expect(row).toContainText("En cours");
  });
});
