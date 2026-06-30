import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { faker } from "@faker-js/faker";
import { BASE_URL, login } from "./utils";

async function openCreatePage(page: Page) {
  await login(page);
  await page.goto(`${BASE_URL}/applications/creer`);
  await expect(page.getByTestId("application-form")).toBeVisible();
}

async function selectFirstOrganization(page: Page, testId: string, search?: string) {
  const root = page.getByTestId(testId);
  const searchTerms = search ? [search] : ["min", "dir", "ser", "dep", "inf", "sys", "app", "com", "org", "ent"];
  const select = root.locator("select");

  await expect(select).toBeVisible();

  for (const searchValue of searchTerms) {
    await root.getByRole("textbox").fill(searchValue);

    let hasOption = false;
    try {
      await expect.poll(async () => (await root.locator("select option:not([value=''])").count()) > 0, { timeout: 4000 }).toBeTruthy();
      hasOption = true;
    } catch {
      hasOption = false;
    }

    if (!hasOption) continue;

    const option = root.locator("select option:not([value=''])").first();
    const value = await option.getAttribute("value");
    expect(value, `Aucune organisation trouvée pour ${testId}`).not.toBeNull();

    await expect(select).toBeEnabled();
    await select.selectOption(value ?? "");
    return;
  }

  throw new Error(`Aucune organisation trouvée pour ${testId} (termes testés: ${searchTerms.join(", ")})`);
}

async function fillRequiredFields(page: Page, { label, moaEmail, moeEmail }: { label: string; moaEmail?: string; moeEmail?: string }) {
  const moaEmailValue = moaEmail ?? faker.internet.email();
  const moaFirstName = faker.person.firstName();
  const moaLastName = faker.person.lastName();
  const moeEmailValue = moeEmail ?? faker.internet.email();
  const moeFirstName = faker.person.firstName();
  const moeLastName = faker.person.lastName();

  await page.getByTestId("application-label").fill(label);
  await page.getByTestId("markdown-textarea").fill("Description E2E - " + label);

  await page.getByTestId("application-next-btn").click();

  // ignore app details
  await expect(page.getByTestId("application-priority-restart")).toBeVisible();
  await page.getByTestId("application-next-btn").click();

  await expect(page.getByTestId("application-moa-organization")).toBeVisible();
  await selectFirstOrganization(page, "application-moa-organization");

  await expect(page.getByTestId("application-moa-email")).toBeVisible();
  await page.getByTestId("application-moa-email").fill(moaEmailValue);
  await page.getByTestId("application-moa-firstname").fill(moaFirstName);
  await page.getByTestId("application-moa-lastname").fill(moaLastName);

  await page.getByTestId("application-next-btn").click();

  await expect(page.getByTestId("application-moe-organization")).toBeVisible();
  await selectFirstOrganization(page, "application-moe-organization");

  await expect(page.getByTestId("application-moe-email")).toBeVisible();
  await page.getByTestId("application-moe-email").fill(moeEmailValue);
  await page.getByTestId("application-moe-firstname").fill(moeFirstName);
  await page.getByTestId("application-moe-lastname").fill(moeLastName);
}

test.describe("CreateApplication page", () => {
  test.describe.configure({ mode: "serial" });

  test("CA-01 — Afficher le formulaire de création", async ({ page }) => {
    await openCreatePage(page);

    await expect(page.getByRole("heading", { level: 1, name: "Créer une application", exact: true })).toBeVisible();
  });

  test("CA-02 — Bloquer l’envoi si champs obligatoires vides", async ({ page }) => {
    await openCreatePage(page);

    await page.getByTestId("application-next-btn").click();

    await expect(page.getByText("Le nom de l'application est obligatoire.")).toBeVisible();
  });

  test("CA-03 — Valider les formats email", async ({ page }) => {
    await openCreatePage(page);

    await page.getByTestId("application-label").fill("Application E2E - Emails invalides");
    await page.getByTestId("markdown-textarea").fill("Description E2E - Emails invalides");

    await page.getByTestId("application-next-btn").click();

    // ignore app details
    await page.getByTestId("application-next-btn").click();

    await selectFirstOrganization(page, "application-moa-organization");

    await page.getByTestId("application-moa-email").fill("invalid-email");
    await page.getByTestId("application-moa-firstname").fill(faker.person.firstName());
    await page.getByTestId("application-moa-lastname").fill(faker.person.lastName());

    await page.getByTestId("application-next-btn").click();

    await expect(page.getByText("L'email du contact MOA est invalide.")).toBeVisible();

    // correct MOA email and test MOE email
    await page.getByTestId("application-moa-email").fill(faker.internet.email());
    await page.getByTestId("application-next-btn").click();

    await selectFirstOrganization(page, "application-moe-organization");

    await page.getByTestId("application-moe-email").fill("invalid-email");
    await page.getByTestId("application-moe-firstname").fill(faker.person.firstName());
    await page.getByTestId("application-moe-lastname").fill(faker.person.lastName());

    await page.getByTestId("application-submit-btn").click();

    await expect(page.getByText("L'email du contact MOE est invalide.")).toBeVisible();
  });

  test("CA-04 — Créer l’application valide et afficher le feedback", async ({ page }) => {
    await openCreatePage(page);
    const label = `Application E2E ${faker.string.alphanumeric({ length: 8 })}`;
    await fillRequiredFields(page, { label });

    const submit = page.getByTestId("application-submit-btn");
    await expect(submit).toBeEnabled();
    const createApp = page.waitForResponse(
      (response) => response.url().includes("/api/v2/applications") && response.request().method() === "POST",
    );
    await submit.click();
    await createApp;

    await page.waitForURL(/\/applications\/[^/]+$/);
    const title = page.getByTestId("application-title");
    await title.waitFor({ state: "visible" });
    await expect(title).toBeVisible();
    await expect(title).toHaveText(label);
  });

  test("CA-05 — Annuler la création et revenir à l’écran précédent", async ({ page }) => {
    await openCreatePage(page);
    await page.getByTestId("application-cancel-btn").click();

    await expect(page).toHaveURL(/\/recherche-application/);
    await expect(page.getByTestId("application-search-title")).toBeVisible();
  });

  test("CA-06 — Avertir si l’utilisateur quitte avec des modifications non sauvegardées", async ({ page }) => {
    await openCreatePage(page);
    await page.getByTestId("application-label").fill("Application non sauvegardée");

    await page.getByTestId("application-cancel-btn").click();

    await expect(page.getByTestId("application-cancel-modal")).toBeVisible();

    await page.getByTestId("application-cancel-modal-close").click();
    await expect(page.getByTestId("application-cancel-modal")).toBeHidden();
    await expect(page.getByTestId("application-form")).toBeVisible();

    await page.getByTestId("application-cancel-btn").click();
    await expect(page.getByTestId("application-cancel-modal")).toBeVisible();
    await page.getByTestId("application-cancel-modal-confirm").click();
    await expect(page).toHaveURL(/\/recherche-application/);
  });

  test("CA-07 — Vérifier l’accessibilité de base", async ({ page }) => {
    await openCreatePage(page);
    await page.waitForLoadState("domcontentloaded");

    const unlabeledControls = await page.evaluate(() => {
      const controls = Array.from(document.querySelectorAll("input, textarea, select"));
      return controls
        .filter((el) => {
          if ((el as HTMLInputElement).type === "hidden") return false;
          if (el.getAttribute("aria-hidden") === "true") return false;
          const id = el.id;
          const hasForLabel = id ? document.querySelector(`label[for="${id}"]`) : null;
          const labelledBy = el.getAttribute("aria-labelledby");
          const hasLabelledBy = labelledBy?.split(" ").some((value) => document.getElementById(value));
          const ariaLabel = el.getAttribute("aria-label");
          return !(hasForLabel || hasLabelledBy || ariaLabel);
        })
        .map((el) => el.tagName.toLowerCase());
    });

    expect(unlabeledControls).toEqual([]);
  });
});
