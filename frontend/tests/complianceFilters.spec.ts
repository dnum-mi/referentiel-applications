import { expect, test, type Page } from "@playwright/test";
import { BASE_URL, login } from "./utils";

const complianceTypes = ["dima", "pdma", "homologation", "rgaa", "dsfr"] as const;

type ComplianceType = (typeof complianceTypes)[number];

async function openComplianceAccordion(page: Page) {
  const complianceFilter = page.getByTestId("compliance-filter");
  if (!(await complianceFilter.isVisible())) {
    await page.getByTestId("sidebar-accordion-compliance").click();
  }
  await expect(complianceFilter).toBeVisible();
}

async function waitForComplianceParam(page: Page, type: ComplianceType | null) {
  await page.waitForURL((url) => {
    const params = new URL(url).searchParams;
    const raw = params.get("compliance__in") ?? "";
    if (!type) return raw.length === 0;
    return raw.split(",").includes(type);
  });
}

test.describe("Application search — compliance filters", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/recherche-application`);
    await expect(page.getByTestId("application-search-title")).toBeVisible();
  });

  for (const type of complianceTypes) {
    test(`should update URL when ${type} filter is toggled`, async ({ page }) => {
      await openComplianceAccordion(page);

      const option = page.getByTestId(`compliance-option-${type}`);
      await option.check();
      await waitForComplianceParam(page, type);
      await expect(option).toBeChecked();

      await option.uncheck();
      await waitForComplianceParam(page, null);
      await expect(option).not.toBeChecked();
    });
  }
});
