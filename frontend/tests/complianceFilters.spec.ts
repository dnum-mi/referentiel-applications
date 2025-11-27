import type { Page, Request } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { faker } from "@faker-js/faker";
import { BASE_URL, login } from "./utils";

const complianceTypes = ["dima", "pdma", "homologation", "rgaa", "dsfr"] as const;
type ComplianceType = (typeof complianceTypes)[number];

type MockCompliance = {
  dima_duration_hours: number | null;
  pdma_duration_hours: number | null;
  rgaa_audit_date: string | null;
  rgaa_score_percentage: number | null;
  dsfr_implemented: boolean | null;
  homologation_date_end: string | null;
  homologation_status: string | null;
};

type SearchResult = {
  id: string;
  label: string;
  shortName: string | null;
  description: string;
  targetPopulations: string[];
  purposes: string[];
  quality: number | null;
  logo: string | null;
  compliance?: MockCompliance | null;
};

type SearchResponse = {
  results: SearchResult[];
  total: number;
};

const baseCompliance: MockCompliance = {
  dima_duration_hours: null,
  pdma_duration_hours: null,
  rgaa_audit_date: null,
  rgaa_score_percentage: null,
  dsfr_implemented: null,
  homologation_date_end: null,
  homologation_status: null,
};

faker.seed(42);

function createCompliance(type: ComplianceType): MockCompliance {
  switch (type) {
    case "dima":
      return { ...baseCompliance, dima_duration_hours: faker.number.int({ min: 1, max: 72 }) };
    case "pdma":
      return { ...baseCompliance, pdma_duration_hours: faker.number.int({ min: 1, max: 72 }) };
    case "rgaa":
      return {
        ...baseCompliance,
        rgaa_audit_date: faker.date.past({ years: 1 }).toISOString(),
        rgaa_score_percentage: faker.number.int({ min: 1, max: 100 }),
      };
    case "dsfr":
      return { ...baseCompliance, dsfr_implemented: true };
    case "homologation":
      return {
        ...baseCompliance,
        homologation_date_end: faker.date.future({ years: 1 }).toISOString(),
        homologation_status: "valid",
      };
  }
}

function createMockApp(type: ComplianceType): SearchResult {
  return {
    id: faker.string.uuid(),
    label: type.toUpperCase(),
    shortName: type,
    description: faker.company.catchPhrase(),
    targetPopulations: [],
    purposes: [],
    quality: faker.number.int({ min: 10, max: 100 }),
    logo: null,
    compliance: createCompliance(type),
  };
}

const appByCompliance = new Map<ComplianceType, SearchResult>();
const apps: SearchResult[] = complianceTypes.map((type) => {
  const app = createMockApp(type);
  appByCompliance.set(type, app);
  return app;
});

function parseComplianceFilters(request: Request): ComplianceType[] {
  const url = new URL(request.url());
  const raw = url.searchParams.getAll("compliance__in");
  return raw
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean) as ComplianceType[];
}

function hasCompliance(app: SearchResult, type: ComplianceType): boolean {
  const compliance = app.compliance;
  if (!compliance) return false;

  switch (type) {
    case "dima":
      return compliance.dima_duration_hours !== null;
    case "pdma":
      return compliance.pdma_duration_hours !== null;
    case "rgaa":
      return compliance.rgaa_audit_date !== null;
    case "dsfr":
      return compliance.dsfr_implemented === true;
    case "homologation":
      return compliance.homologation_date_end !== null;
  }
}

async function mockComplianceSearch(page: Page) {
  await page.route("**/api/v2/applications**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() !== "GET" || url.pathname !== "/api/v2/applications") {
      await route.fallback();
      return;
    }

    const requested = parseComplianceFilters(request);
    const results = requested.length ? apps.filter((app) => requested.every((filter) => hasCompliance(app, filter))) : apps;

    const body: SearchResponse = { results, total: results.length };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}

function waitForComplianceResponse(page: Page, expectedFilters: ComplianceType[]) {
  const expected = [...expectedFilters].sort();
  return page.waitForResponse(
    (response) => {
      const request = response.request();
      if (request.method() !== "GET" || !request.url().includes("/api/v2/applications")) {
        return false;
      }

      const filters = parseComplianceFilters(request).sort();
      return response.ok() && filters.length === expected.length && filters.every((value, index) => value === expected[index]);
    },
    { timeout: 30_000 },
  );
}

async function openComplianceAccordion(page: Page) {
  const complianceFilter = page.getByTestId("compliance-filter");
  if (!(await complianceFilter.isVisible())) {
    await page.getByTestId("sidebar-accordion-compliance").click();
  }
  await expect(complianceFilter).toBeVisible();
}

function getApplicationTable(page: Page) {
  return page.getByTestId("application-table");
}

async function toggleAndAssert(page: Page, type: ComplianceType) {
  const option = page.getByTestId(`compliance-option-${type}`);
  const table = getApplicationTable(page);
  await expect(table).toBeVisible();

  const checkedResponse = waitForComplianceResponse(page, [type]);
  await option.check();
  await checkedResponse;
  await expect(page.getByTestId("sidebar-total-count")).toContainText("1");
  const expectedApp = appByCompliance.get(type);
  if (expectedApp) {
    await expect(table).toContainText(expectedApp.label);
    const otherLabels = apps.filter((app) => app.id !== expectedApp.id).map((app) => app.label);
    for (const label of otherLabels) {
      await expect(table).not.toContainText(label);
    }
  }

  const uncheckedResponse = waitForComplianceResponse(page, []);
  await option.uncheck();
  await uncheckedResponse;
  await expect(page.getByTestId("sidebar-total-count")).toContainText(String(apps.length));
}

test.describe("Application search — compliance filters", () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeEach(async ({ page }) => {
    await mockComplianceSearch(page);
    await login(page);
    await page.goto(`${BASE_URL}/recherche-application`);
  });

  for (const type of complianceTypes) {
    test(`should update search queries when ${type} filter is toggled`, async ({ page }) => {
      await openComplianceAccordion(page);
      await toggleAndAssert(page, type);
    });
  }
});
