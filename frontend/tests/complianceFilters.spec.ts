import { expect, test, type Page } from "@playwright/test";
import { gotoSearchPage } from "./utils";

type StateOption = { label: string; param: string };

// Critères de présence : Tous / Présent / Absent.
const PRESENCE_STATES: StateOption[] = [
  { label: "Présent", param: "compliancePresent__in" },
  { label: "Absent", param: "complianceAbsent__in" },
];

// Critères booléens (PRA, DSFR) : Tous / Oui / Non / Non renseigné.
const BOOLEAN_STATES: StateOption[] = [
  { label: "Oui", param: "compliancePresent__in" },
  { label: "Non", param: "complianceAbsent__in" },
  { label: "Non renseigné", param: "complianceUnset__in" },
];

const criteria: { name: string; states: StateOption[] }[] = [
  { name: "pra", states: BOOLEAN_STATES },
  { name: "dsfr", states: BOOLEAN_STATES },
  { name: "dima", states: PRESENCE_STATES },
  { name: "pdma", states: PRESENCE_STATES },
  { name: "homologation", states: PRESENCE_STATES },
  { name: "rgaa", states: PRESENCE_STATES },
  { name: "rgpd", states: PRESENCE_STATES },
];

const ALL_PARAMS = ["compliancePresent__in", "complianceAbsent__in", "complianceUnset__in"];

async function openComplianceAccordion(page: Page) {
  const complianceFilter = page.getByTestId("compliance-filter");
  if (!(await complianceFilter.isVisible())) {
    await page.getByTestId("sidebar-accordion-compliance").click();
  }
  await expect(complianceFilter).toBeVisible();
}

function paramIncludes(url: string, param: string, value: string) {
  const raw = new URL(url).searchParams.get(param) ?? "";
  return raw.split(",").filter(Boolean).includes(value);
}

async function selectState(page: Page, criterion: string, label: string) {
  // Chaque critère est rendu via un <select> DSFR : on sélectionne l'option par son libellé.
  await page.getByTestId(`compliance-option-${criterion}`).locator("select").selectOption({ label });
}

test.describe("Application search — compliance filters (états)", () => {
  test.beforeEach(async ({ page }) => {
    await gotoSearchPage(page);
  });

  for (const { name, states } of criteria) {
    test(`met à jour l'URL pour le critère ${name}`, async ({ page }) => {
      await openComplianceAccordion(page);

      for (const { label, param } of states) {
        await selectState(page, name, label);
        await page.waitForURL((url) => {
          // Le critère doit être présent dans son paramètre et absent des autres.
          const inExpected = paramIncludes(url, param, name);
          const inOthers = ALL_PARAMS.filter((p) => p !== param).some((p) => paramIncludes(url, p, name));
          return inExpected && !inOthers;
        });
      }

      // « Tous » réinitialise le critère sur tous les paramètres.
      await selectState(page, name, "Tous");
      await page.waitForURL((url) => ALL_PARAMS.every((p) => !paramIncludes(url, p, name)));
    });
  }
});
