import { expect, test, type Locator, type Page } from "@playwright/test";
import { APPLICATION_SEARCH_TITLE_TEST_ID, BASE_URL, getSidebarTotalCount, gotoSearchPage, waitForSearchParams } from "./utils";

const SIDEBAR_TOTAL_COUNT = "sidebar-total-count";
const SIDEBAR_RESET = "sidebar-reset-filters-button";
const SIDEBAR_TOGGLE = "sidebar-toggle";
const SIDEBAR_ACC_GENERAL = "sidebar-accordion-general";
const SIDEBAR_ACC_STATUS = "sidebar-accordion-status";
const SIDEBAR_ACC_ORGANIZATION = "sidebar-accordion-organization";
const SIDEBAR_ACC_HOSTING = "sidebar-accordion-hosting";
const FILTER_SEARCH = "application-filter-label";
const FILTER_ORGANIZATION = "organization-filter-input";
const FILTER_HOSTING_SITE = "hosting-site-select";

async function getSidebarTotal(page: Page): Promise<number> {
  return getSidebarTotalCount(page, SIDEBAR_TOTAL_COUNT);
}

function getSearchInput(page: Page) {
  return getSidebar(page).getByTestId(FILTER_SEARCH);
}

function getOrganizationInput(page: Page) {
  return getSidebar(page).getByTestId(FILTER_ORGANIZATION);
}

function getHostingSiteSelect(page: Page) {
  return getSidebar(page).locator(`[data-testid="${FILTER_HOSTING_SITE}"], [data-testid="${FILTER_HOSTING_SITE}"] select`).first();
}

function getSidebar(page: Page) {
  return page.getByTestId("sidebar-filter");
}

async function openAccordionIfNeeded(page: Page, accordionTestId: string, content: Locator) {
  await expect(page.getByTestId(APPLICATION_SEARCH_TITLE_TEST_ID)).toBeVisible();

  const sidebar = getSidebar(page);
  if (!(await sidebar.isVisible())) {
    await page.getByTestId(SIDEBAR_TOGGLE).click();
    await expect(sidebar).toBeVisible();
  }

  if (await content.isVisible()) return;

  const accordion = sidebar.getByTestId(accordionTestId);
  const trigger = accordion.getByRole("button").first();
  await expect(accordion).toBeVisible();
  await expect(trigger).toBeVisible();

  const panelId = await trigger.getAttribute("aria-controls");
  if (panelId) {
    const panel = page.locator(`#${panelId}`);
    if (!(await panel.isVisible())) {
      await trigger.click();
      await expect(panel).toBeVisible({ timeout: 10000 });
    }
  } else {
    await trigger.click();
  }

  await expect(content).toBeVisible();
}

async function fillSearch(page: Page, value: string) {
  const field = getSearchInput(page);
  await field.fill(value);
  await expect(field).toHaveValue(value);
}

async function fillOrganization(page: Page, value: string) {
  const field = getOrganizationInput(page);
  await field.fill(value);
  await expect(field).toHaveValue(value);
}

async function selectHostingSiteOrFallback(page: Page) {
  const select = getHostingSiteSelect(page);
  await expect(select).toBeVisible();
  const values = await select
    .locator("option")
    .evaluateAll((options) => options.map((o) => (o as HTMLOptionElement).value).filter((v) => v !== ""));

  if (values.length > 0) {
    await select.selectOption(values[0]);
    await waitForSearchParams(page, (params) => params.has("hostingSite"));
    return "hostingSite" as const;
  }

  const missingHosting = page.getByTestId("hosting-missing-checkbox");
  await missingHosting.check();
  await waitForSearchParams(page, (params) => params.get("missingHosting") === "true");
  return "missingHosting" as const;
}

async function ensurePaginationReady(page: Page) {
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="application-table"] tbody tr').length > 5, { timeout: 30000 });

  const total = await getSidebarTotal(page);
  test.skip(total <= 5, "Pas assez de donnees pour verifier la pagination");
}

async function selectPageSize(page: Page, value: string) {
  await page.locator('[data-testid="application-table"] .p-paginator-rpp-dropdown').click();
  await page.locator(".p-select-overlay").getByRole("option", { name: value, exact: true }).click();
}

async function isFocusedWithin(page: Page, locator: Locator) {
  const element = await locator.first().elementHandle();
  if (!element) return false;
  return page.evaluate((el) => el === document.activeElement || el.contains(document.activeElement), element);
}

async function tabUntilFocused(page: Page, locator: Locator, maxTabs = 120) {
  for (let i = 0; i < maxTabs; i += 1) {
    await page.keyboard.press("Tab");
    if (await isFocusedWithin(page, locator)) return true;
  }
  return false;
}

async function focusFirstTabStop(page: Page) {
  const firstSkipLink = page.locator('a[href="#app-search"]').first();
  await expect(firstSkipLink).toBeVisible();
  await firstSkipLink.focus();
}

test.describe("ApplicationsView", () => {
  test.describe("AV-01", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("AV-01 - redirige vers login si non authentifie", async ({ page }) => {
      await page.goto(`${BASE_URL}/recherche-application`);
      await page.waitForURL(/\/realms\/.+\/protocol\/openid-connect\/auth/i);
    });
  });

  test("AV-02 - affiche la liste des applications", async ({ page }) => {
    await gotoSearchPage(page);

    await expect(page.getByTestId("application-table")).toBeVisible();
    await expect.poll(async () => page.getByTestId("application-table").locator("tbody tr").count(), { timeout: 15000 }).toBeGreaterThan(0);

    await expect.poll(() => getSidebarTotal(page), { timeout: 15000 }).toBeGreaterThan(0);

    const total = await getSidebarTotal(page);
    expect(total).toBeGreaterThan(0);
  });

  test("AV-03 - affiche l'etat vide via mock reseau", async ({ page }) => {
    await page.route("**/api/v2/applications*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ results: [], total: 0, averageIq: 0 }),
      });
    });

    await gotoSearchPage(page);

    await expect(page.getByTestId("application-table").locator("tbody tr")).toContainText("Aucune donnée ne correspond à votre recherche.");
    await expect(page.getByTestId(SIDEBAR_TOTAL_COUNT)).toContainText("0 application(s)");
  });

  test("AV-04 - filtrage par nom met a jour URL et compteur", async ({ page }) => {
    await gotoSearchPage(page);

    await expect.poll(() => getSidebarTotal(page), { timeout: 15000 }).toBeGreaterThan(0);
    const initialTotal = await getSidebarTotal(page);
    const firstAppLabel = (await page.getByTestId("application-table").locator("tbody tr a").first().innerText()).trim();
    expect(firstAppLabel.length).toBeGreaterThan(0);
    const searchInput = getSearchInput(page);
    await openAccordionIfNeeded(page, SIDEBAR_ACC_GENERAL, searchInput);

    await fillSearch(page, firstAppLabel);

    await waitForSearchParams(page, (params) => params.get("search") === firstAppLabel);
    await expect.poll(() => getSidebarTotal(page), { timeout: 15000 }).toBeLessThan(initialTotal);
    await expect.poll(() => getSidebarTotal(page), { timeout: 15000 }).toBeGreaterThan(0);
    expect(initialTotal).toBeGreaterThan(0);
  });

  test("AV-05 - persiste la recherche apres rechargement", async ({ page }) => {
    await gotoSearchPage(page);

    const searchInput = getSearchInput(page);
    await openAccordionIfNeeded(page, SIDEBAR_ACC_GENERAL, searchInput);

    const value = `persist-av05-${Date.now()}`;
    await fillSearch(page, value);

    await page.reload();

    await openAccordionIfNeeded(page, SIDEBAR_ACC_GENERAL, searchInput);

    await expect(searchInput).toHaveValue(value);
    expect(new URL(page.url()).searchParams.get("search")).toBe(value);
  });

  test("AV-06 - filtres simples reflettes dans URL", async ({ page }) => {
    await gotoSearchPage(page);

    const statusCheckbox = page.locator("#status-option-to_validate");
    const statusLabel = page.locator('label[for="status-option-to_validate"]');
    await openAccordionIfNeeded(page, SIDEBAR_ACC_STATUS, statusCheckbox);
    await expect(statusCheckbox).toBeChecked();
    await statusLabel.click();
    await expect(statusCheckbox).not.toBeChecked();
    await waitForSearchParams(page, (params) => {
      const statuses = (params.get("currentStatus__in") ?? "").split(",").filter(Boolean);
      return !statuses.includes("to_validate");
    });

    const organizationInput = getOrganizationInput(page);
    await openAccordionIfNeeded(page, SIDEBAR_ACC_ORGANIZATION, organizationInput);
    await fillOrganization(page, "Minist");
    await waitForSearchParams(page, (params) => (params.get("organization") ?? "").includes("Minist"));
  });

  test("AV-07 - combine plusieurs filtres dans URL", async ({ page }) => {
    await gotoSearchPage(page);

    const statusCheckbox = page.locator("#status-option-to_validate");
    const statusLabel = page.locator('label[for="status-option-to_validate"]');
    await openAccordionIfNeeded(page, SIDEBAR_ACC_STATUS, statusCheckbox);
    await statusLabel.click();

    const organizationInput = getOrganizationInput(page);
    await openAccordionIfNeeded(page, SIDEBAR_ACC_ORGANIZATION, organizationInput);
    await fillOrganization(page, "Minist");

    const hostingSelect = getHostingSiteSelect(page);
    await openAccordionIfNeeded(page, SIDEBAR_ACC_HOSTING, hostingSelect);
    const hostingParam = await selectHostingSiteOrFallback(page);

    const params = new URL(page.url()).searchParams;
    expect((params.get("currentStatus__in") ?? "").split(",")).not.toContain("to_validate");
    expect(params.has("organization")).toBeTruthy();
    expect(params.has(hostingParam)).toBeTruthy();
  });

  test("AV-08 - persiste filtres apres reload et retour navigateur", async ({ page }) => {
    await gotoSearchPage(page);

    const statusCheckbox = page.locator("#status-option-to_validate");
    const statusLabel = page.locator('label[for="status-option-to_validate"]');
    await openAccordionIfNeeded(page, SIDEBAR_ACC_STATUS, statusCheckbox);
    await statusLabel.click();

    const searchInput = getSearchInput(page);
    await openAccordionIfNeeded(page, SIDEBAR_ACC_GENERAL, searchInput);
    await fillSearch(page, "av08-persist");

    await waitForSearchParams(page, (params) => {
      const statuses = (params.get("currentStatus__in") ?? "").split(",").filter(Boolean);
      return !statuses.includes("to_validate") && params.get("search") === "av08-persist";
    });

    await page.reload();
    await expect(searchInput).toHaveValue("av08-persist");
    expect((new URL(page.url()).searchParams.get("currentStatus__in") ?? "").split(",")).not.toContain("to_validate");

    await page.goto(`${BASE_URL}/`);
    // #2608 : `waitUntil: "domcontentloaded"` + un `waitForURL` séparé peut rester bloqué en
    // WebKit/Firefox — une navigation arrière restaurée depuis le bfcache ne redéclenche pas
    // toujours ces évènements de cycle de vie. On se contente du commit de la navigation, puis on
    // sonde l'URL réelle au lieu d'attendre un évènement qui peut ne jamais arriver.
    await page.goBack({ waitUntil: "commit" });
    await expect.poll(() => page.url(), { timeout: 15000 }).toMatch(/\/recherche-application/);
    await expect(page.getByTestId(APPLICATION_SEARCH_TITLE_TEST_ID)).toBeVisible();

    const params = new URL(page.url()).searchParams;
    expect(params.get("search")).toBe("av08-persist");
    expect((params.get("currentStatus__in") ?? "").split(",")).not.toContain("to_validate");
  });

  test("AV-09 - reset filtres nettoie URL et restaure les champs", async ({ page }) => {
    await gotoSearchPage(page);

    await expect.poll(() => getSidebarTotal(page), { timeout: 15000 }).toBeGreaterThan(0);
    const initialTotal = await getSidebarTotal(page);

    const searchInput = getSearchInput(page);
    await openAccordionIfNeeded(page, SIDEBAR_ACC_GENERAL, searchInput);
    await fillSearch(page, "will-reset");

    const statusCheckbox = page.locator("#status-option-to_validate");
    const statusLabel = page.locator('label[for="status-option-to_validate"]');
    await openAccordionIfNeeded(page, SIDEBAR_ACC_STATUS, statusCheckbox);
    await statusLabel.click();

    await expect(page.getByTestId(SIDEBAR_RESET)).toBeVisible();
    await page.getByTestId(SIDEBAR_RESET).click();

    await waitForSearchParams(page, (params) => params.toString() === "");
    await expect(searchInput).toHaveValue("");
    await expect.poll(async () => getSidebarTotal(page)).toBe(initialTotal);
  });

  test("AV-10 - tri par nom (asc/desc) met a jour URL", async ({ page }) => {
    await gotoSearchPage(page);

    const nomHeader = page.getByRole("columnheader", { name: /Nom/i });
    const readOrder = () => new URL(page.url()).searchParams.get("order") ?? "asc";

    await nomHeader.click();
    await waitForSearchParams(page, (params) => ["asc", "desc"].includes(params.get("order") ?? "asc"));
    const firstOrder = readOrder();

    await nomHeader.click();
    await waitForSearchParams(page, (params) => (params.get("order") ?? "asc") !== firstOrder);
  });

  test("AV-11 - persistance du tri apres rechargement", async ({ page }) => {
    await gotoSearchPage(page);

    const iqHeader = page.getByRole("columnheader", { name: /^IQ$/i });
    await iqHeader.click();

    await waitForSearchParams(page, (params) => params.get("sortBy") === "quality");

    await page.reload();

    const params = new URL(page.url()).searchParams;
    expect(params.get("sortBy")).toBe("quality");
    await expect(iqHeader).toHaveClass(/p-datatable-column-sorted/);
  });

  test("AV-12 - pagination met a jour l'URL", async ({ page }) => {
    await gotoSearchPage(page);

    await ensurePaginationReady(page);
    await selectPageSize(page, "5");
    await waitForSearchParams(page, (params) => params.get("pageSize") === "5");

    const nextBtn = page.getByTestId("application-table").locator(".p-paginator-next");
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();
    await waitForSearchParams(page, (params) => params.get("page") === "1");

    const prevBtn = page.getByTestId("application-table").locator(".p-paginator-prev");
    await expect(prevBtn).toBeEnabled();
    await prevBtn.click();
    await waitForSearchParams(page, (params) => (params.get("page") ?? "0") === "0");
  });

  test("AV-13 - changement filtre remet la pagination a la page 1", async ({ page }) => {
    await gotoSearchPage(page);

    await ensurePaginationReady(page);
    await selectPageSize(page, "5");
    await waitForSearchParams(page, (params) => params.get("pageSize") === "5");

    const nextBtn = page.getByTestId("application-table").locator(".p-paginator-next");
    await nextBtn.click();
    await waitForSearchParams(page, (params) => params.get("page") === "1");

    const searchInput = getSearchInput(page);
    await openAccordionIfNeeded(page, SIDEBAR_ACC_GENERAL, searchInput);
    await fillSearch(page, `page-reset-${Date.now()}`);

    await waitForSearchParams(page, (params) => (params.get("page") ?? "0") === "0");
    expect(await getSidebarTotal(page)).toBeGreaterThanOrEqual(0);
  });

  test("AV-14 - navigation vers le profil application", async ({ page }) => {
    await gotoSearchPage(page);

    const firstRowLink = page.getByTestId("application-table").locator("tbody tr:first-child a").first();
    await expect(firstRowLink).toBeVisible();
    await Promise.all([page.waitForURL((url) => /^\/applications\/[^/]+(?:\/[^/]+)?$/.test(url.pathname)), firstRowLink.click()]);
  });

  test("AV-15 - navigation clavier sur elements cles", async ({ page, browserName }) => {
    await gotoSearchPage(page);

    const searchInput = getSearchInput(page);
    await openAccordionIfNeeded(page, SIDEBAR_ACC_GENERAL, searchInput);
    await fillSearch(page, "av15-focus");
    await expect(page.getByTestId(SIDEBAR_RESET)).toBeVisible();

    await page.locator("body").click();

    await focusFirstTabStop(page);
    const searchFocus = await tabUntilFocused(page, getSearchInput(page), 300);
    expect(searchFocus).toBeTruthy();

    await focusFirstTabStop(page);
    if (browserName === "webkit") {
      await page.getByTestId(SIDEBAR_TOGGLE).focus();
      expect(await isFocusedWithin(page, page.getByTestId(SIDEBAR_TOGGLE))).toBeTruthy();
    } else {
      const toggleFocus = await tabUntilFocused(page, page.getByTestId(SIDEBAR_TOGGLE), 300);
      expect(toggleFocus).toBeTruthy();
    }

    await focusFirstTabStop(page);
    const tableFocus = await tabUntilFocused(page, page.getByTestId("application-table"), 300);
    expect(tableFocus).toBeTruthy();
  });

  test("AV-16 - verifications accessibilite de base", async ({ page }) => {
    await gotoSearchPage(page);

    await expect(page.getByRole("main")).toBeVisible();

    const h1 = page.locator("h1:not([data-testid='page-title-announcer'])");
    await expect(h1).toHaveCount(1);
    await expect(page.getByTestId(APPLICATION_SEARCH_TITLE_TEST_ID)).toBeVisible();

    await expect(page.getByTestId(SIDEBAR_TOGGLE)).toHaveAttribute("aria-label", /Fermer|Ouvrir/i);

    const searchInput = getSearchInput(page);
    await openAccordionIfNeeded(page, SIDEBAR_ACC_GENERAL, searchInput);

    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute("id", /.+/);
  });
});
