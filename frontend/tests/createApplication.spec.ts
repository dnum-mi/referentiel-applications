import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { faker } from "@faker-js/faker";

const BASE_URL = "http://localhost:5173";
const KC_USER = process.env.KC_USER ?? "admin";
const KC_PASS = process.env.KC_PASS ?? "pass";

async function login(page: Page) {
  await page.goto(`${BASE_URL}/`);
  await page
    .getByRole("banner")
    .getByRole("link", { name: /Se connecter|Sign in/i })
    .click();

  await page.waitForURL(/\/realms\/.+\/protocol\/openid-connect\/auth/i, { timeout: 15_000 });

  await page.locator('#username, #kc-username, input[name="username"]').first().fill(KC_USER);
  await page.locator('#password, #kc-password, input[name="password"]').first().fill(KC_PASS);

  await Promise.all([
    page.waitForURL(new RegExp(`^${BASE_URL.replace(/\//g, "\\/")}`), { timeout: 20_000 }),
    page.locator('#kc-login, button[name="login"], input[type="submit"]').first().click(),
  ]);

  await expect(page.getByTestId("main-navigation")).toBeVisible({ timeout: 15_000 });
}

async function openCreatePage(page: Page) {
  await mockOrganizations(page);
  await mockActorTypes(page);
  await mockApplications(page);
  await login(page);
  await page.goto(`${BASE_URL}/applications/creer`);
  await page.waitForURL(/\/applications\/creer/, { timeout: 20_000 });
  await expect(page.getByTestId("application-form")).toBeVisible({ timeout: 15_000 });
}

async function mockOrganizations(page: Page) {
  const organization = {
    id: faker.string.uuid(),
    path: `Org ${faker.company.name()} ${faker.string.alphanumeric({ length: 6 })}`,
    url: faker.internet.url(),
    sigle: faker.string.alpha({ length: 4, casing: "upper" }),
    parentId: null,
  };

  await page.route(/\/api\/v2\/organizations(\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([organization]),
    });
  });

  return organization;
}

async function mockActorTypes(page: Page) {
  const actorTypes = [
    { id: faker.string.uuid(), code: "MOA", label: "MOA" },
    { id: faker.string.uuid(), code: "MOE", label: "MOE" },
  ];

  await page.route(/\/api\/v2\/actorTypes(\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(actorTypes),
    });
  });

  return actorTypes;
}

async function mockApplications(page: Page) {
  let createdApplicationId = faker.string.uuid();
  let createdApplicationBody: Record<string, any> | null = null;

  await page.route(/\/api\/v2\/applications$/, async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    const requestBody = (await route.request().postDataJSON()) as Record<string, any>;
    createdApplicationId = faker.string.uuid();
    createdApplicationBody = requestBody;

    const responseBody = {
      id: createdApplicationId,
      label: requestBody.label ?? `App ${faker.company.name()}`,
      shortName: requestBody.shortName ?? null,
      description: requestBody.description ?? "",
      targetPopulations: requestBody.targetPopulations ?? [],
      purposes: requestBody.purposes ?? [],
      quality: null,
      logo: null,
    };

    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify(responseBody),
    });
  });

  await page.route(/\/api\/v2\/applications\/[^/]+\/actors$/, async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });

  await page.route(/\/api\/v2\/applications\/[^/]+$/, async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }

    const responseBody = createdApplicationBody
      ? {
          id: createdApplicationId,
          label: createdApplicationBody.label ?? `App ${faker.company.name()}`,
          shortName: createdApplicationBody.shortName ?? null,
          description: createdApplicationBody.description ?? "",
          targetPopulations: createdApplicationBody.targetPopulations ?? [],
          purposes: createdApplicationBody.purposes ?? [],
          quality: null,
          logo: null,
        }
      : {
          id: createdApplicationId,
          label: `App ${faker.company.name()}`,
          shortName: null,
          description: "",
          targetPopulations: [],
          purposes: [],
          quality: null,
          logo: null,
        };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(responseBody),
    });
  });
}

async function selectFirstOrganization(page: Page, testId: string, search?: string) {
  const root = page.getByTestId(testId);
  const searchValue = search ?? faker.string.alpha({ length: 1, casing: "lower" });

  await root.getByRole("textbox").fill(searchValue);

  const option = root.locator("select option:not([value=''])").first();
  await option.waitFor({ state: "attached", timeout: 10_000 });

  const value = await option.getAttribute("value");
  expect(value, `Aucune organisation trouvée pour ${testId}`).not.toBeNull();

  await root.locator("select").selectOption(value ?? "");
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
  await page.getByTestId("application-next-btn").click();

  await selectFirstOrganization(page, "application-moa-organization");

  await page.getByTestId("application-moa-email").fill(moaEmailValue);
  await page.getByTestId("application-moa-firstname").fill(moaFirstName);
  await page.getByTestId("application-moa-lastname").fill(moaLastName);

  await page.getByTestId("application-next-btn").click();

  await selectFirstOrganization(page, "application-moe-organization");

  await page.getByTestId("application-moe-email").fill(moeEmailValue);
  await page.getByTestId("application-moe-firstname").fill(moeFirstName);
  await page.getByTestId("application-moe-lastname").fill(moeLastName);
}

test.describe("CreateApplication page", () => {
  test.describe.configure({ mode: "serial" });

  test("CA-01 — Afficher le formulaire de création", async ({ page }) => {
    await openCreatePage(page);

    await expect(page.getByRole("heading", { level: 1, name: "Créer une application" })).toBeVisible();
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

    await page.getByTestId("application-submit-btn").click();

    // Wait for redirect to application page (proves creation succeeded)
    await page.waitForURL(/\/applications\/[^/]+$/, { timeout: 20_000 });
    // Verify we're on the application detail page
    await expect(page.getByRole("heading", { level: 1 })).toContainText(label);
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
