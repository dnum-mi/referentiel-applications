import { expect, test, type Locator, type Page } from "@playwright/test";

const targetsApi = /\/api\/v2\/quality-campaigns\/quality-qa\/targets(?:\?.*)?$/;
const campaignApi = /\/api\/v2\/quality-campaigns\/quality-qa$/;
const exportApi = /\/api\/v2\/technologies\/end-of-life\/export(?:\?.*)?$/;
const mditApi = /\/api\/v2\/mdit-campaigns\/mdit-qa$/;
const campaign = {
  id: "quality-qa",
  name: "Campagne qualité fictive",
  sponsorEmails: [],
  startDate: "2026-11-20T00:00:00Z",
  createdAt: "2026-11-20T00:00:00Z",
  sentAt: "2026-11-20T00:00:00Z",
  filters: {},
  status: "scheduled",
  targetCount: 30,
};
const targets = {
  results: [{ applicationId: "app-qa", label: "Application fictive", iqAtStart: 30, iqCurrent: 50, delta: 20 }],
  total: 30,
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v2/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/config")) {
      await route.fulfill({
        json: { oidcConfigUrl: "https://oidc.example.invalid/.well-known/openid-configuration", oidcClientId: "qa" },
      });
    } else if (path.endsWith("/users/me")) {
      await route.fulfill({
        json: { id: "user-qa", role: "ADMIN", permissions: ["TechnologyList", "DataExport"], email: "qa@example.invalid" },
      });
    } else if (targetsApi.test(route.request().url())) {
      await route.fulfill({ json: targets });
    } else if (campaignApi.test(route.request().url())) {
      await route.fulfill({ json: campaign });
    } else if (path.endsWith("/technologies/end-of-life")) {
      await route.fulfill({ json: { results: [], total: 0 } });
    } else {
      // Une API oubliée ne peut pas atteindre un backend ou un service externe.
      await route.abort("blockedbyclient");
    }
  });
});

async function open(page: Page, view: "targets" | "technologies" | "quality" | "mdit") {
  await page.goto(`/tests/browser/fixtures/campaignErrorsFocus.html?view=${view}`);
  await expect(page.getByTestId("outside-control")).toBeVisible();
}

async function deferredResponse(page: Page, api: RegExp, status = 200, json: unknown = targets) {
  let release = () => {};
  const ready = new Promise<void>((resolve) => (release = resolve));
  const requests: URL[] = [];
  await page.route(api, async (route) => {
    requests.push(new URL(route.request().url()));
    await ready;
    if (api === exportApi && status === 200) {
      await route.fulfill({
        status,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        body: "export fictif",
      });
    } else {
      await route.fulfill({ status, json: status === 200 ? json : { message: "Échec simulé" } });
    }
  });
  return { release, requests };
}

async function input(page: Page, testId: string): Promise<Locator> {
  const control = page.getByTestId(testId);
  return (await control.evaluate((element) => element.matches("input, textarea"))) ? control : control.locator("input, textarea");
}

async function expectInvalid(field: Locator, message: string) {
  await expect(field).toBeFocused();
  await expect(field).toHaveAttribute("aria-invalid", "true");
  await expect(field).toHaveAccessibleDescription(new RegExp(message.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}

for (const status of [200, 500]) {
  test(`F1 Actualiser conserve le focus et refuse les doublons, HTTP ${status}`, async ({ page }) => {
    await open(page, "targets");
    await expect(page.getByText("30 cible(s) consultable(s) pour ce filtre", { exact: true })).toBeVisible();
    const targetResponse = await deferredResponse(page, targetsApi, status);
    const campaignResponse = await deferredResponse(page, campaignApi, 200, campaign);
    const refresh = page.getByRole("button", { name: "Actualiser", exact: true });
    await refresh.focus();
    await refresh.press("Enter");
    await expect.poll(() => targetResponse.requests.length).toBe(1);
    await expect.poll(() => campaignResponse.requests.length).toBe(1);
    await expect(refresh).toBeFocused();
    await expect(refresh).toHaveAttribute("aria-disabled", "true");
    await expect(refresh).toHaveAttribute("aria-busy", "true");
    await refresh.press("Enter");
    await refresh.press("Space");
    expect(targetResponse.requests).toHaveLength(1);
    expect(campaignResponse.requests).toHaveLength(1);
    targetResponse.release();
    await expect(
      page.getByText(status === 200 ? "30 cible(s) consultable(s) pour ce filtre" : "Impossible de charger les cibles.", { exact: true }),
    ).toBeVisible();
    await expect(refresh).toHaveAttribute("aria-disabled", "true");
    await expect(refresh).toBeFocused();
    campaignResponse.release();
    await expect(refresh).toHaveAttribute("aria-disabled", "false");
    await expect(refresh).toBeFocused();
  });
}

for (const moveFocus of [false, true]) {
  test(`F1 Réessayer : succès, focus volontaire=${moveFocus}`, async ({ page }) => {
    await page.route(targetsApi, (route) => route.fulfill({ status: 500, json: { message: "Échec simulé" } }));
    await open(page, "targets");
    const retry = page.getByRole("button", { name: "Réessayer", exact: true });
    await expect(retry).toBeVisible();
    const response = await deferredResponse(page, targetsApi);
    await retry.focus();
    await retry.press("Enter");
    await expect.poll(() => response.requests.length).toBe(1);
    await expect(retry).toBeFocused();
    await expect(retry).toHaveAttribute("aria-disabled", "true");
    await retry.press("Enter");
    expect(response.requests).toHaveLength(1);
    const progression = page.getByLabel("Progression", { exact: true });
    if (moveFocus) await progression.focus();
    response.release();
    await expect(retry).toHaveCount(0);
    await expect(moveFocus ? progression : page.getByRole("button", { name: "Actualiser", exact: true })).toBeFocused();
  });
}

test("F1 Réessayer garde sa commande et son focus après un nouvel échec", async ({ page }) => {
  await page.route(targetsApi, (route) => route.fulfill({ status: 500, json: { message: "Échec simulé" } }));
  await open(page, "targets");
  const retry = page.getByRole("button", { name: "Réessayer", exact: true });
  await expect(retry).toBeVisible();
  const response = await deferredResponse(page, targetsApi, 500);
  await retry.focus();
  await retry.press("Enter");
  await expect(retry).toHaveAttribute("aria-disabled", "true");
  response.release();
  await expect(retry).toHaveAttribute("aria-disabled", "false");
  await expect(retry).toBeFocused();
});

test("F1 retour volontaire sur Réessayer avant succès : restitue le focus à Actualiser", async ({ page }) => {
  await page.route(targetsApi, (route) => route.fulfill({ status: 500, json: { message: "Échec simulé" } }));
  await open(page, "targets");
  const retry = page.getByRole("button", { name: "Réessayer", exact: true });
  await expect(retry).toBeVisible();
  const response = await deferredResponse(page, targetsApi);
  await retry.focus();
  await retry.press("Enter");
  await expect(retry).toHaveAttribute("aria-disabled", "true");
  await page.getByLabel("Progression", { exact: true }).focus();
  await retry.focus();
  response.release();
  await expect(retry).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Actualiser", exact: true })).toBeFocused();
});

test("F1 pagination et déplacement volontaire pendant Actualiser restent respectés", async ({ page }) => {
  await open(page, "targets");
  const next = page.getByTestId("pagination-next");
  await expect(next).toHaveAttribute("aria-disabled", "false");
  const response = await deferredResponse(page, targetsApi);
  await next.focus();
  await next.press("Enter");
  await expect.poll(() => response.requests.length).toBe(1);
  await expect(next).toBeFocused();
  expect(response.requests[0].searchParams.get("page")).toBe("1");
  response.release();
  await expect(page.getByTestId("pagination-page-status")).toHaveText("Page 2 sur 2");
  await expect(next).toBeFocused();
  const refreshResponse = await deferredResponse(page, targetsApi);
  await page.getByRole("button", { name: "Actualiser", exact: true }).press("Enter");
  await expect.poll(() => refreshResponse.requests.length).toBe(1);
  const progression = page.getByLabel("Progression", { exact: true });
  await progression.focus();
  refreshResponse.release();
  await expect(page.getByText("30 cible(s) consultable(s) pour ce filtre", { exact: true })).toBeVisible();
  await expect(progression).toBeFocused();
});

for (const status of [200, 500]) {
  for (const moveFocus of [false, true]) {
    test(`F2 export : HTTP ${status}, focus volontaire=${moveFocus}`, async ({ page }) => {
      await open(page, "technologies");
      const exportButton = page.getByTestId("end-of-life-export-excel");
      await expect(exportButton).toBeVisible();
      const response = await deferredResponse(page, exportApi, status);
      await exportButton.focus();
      await exportButton.press("Enter");
      await expect.poll(() => response.requests.length).toBe(1);
      await expect(exportButton).toBeFocused();
      await expect(exportButton).toHaveAttribute("aria-disabled", "true");
      await expect(exportButton).toHaveAttribute("aria-busy", "true");
      await exportButton.press("Enter");
      await exportButton.press("Space");
      expect(response.requests).toHaveLength(1);
      const other = page.getByTestId("end-of-life-clear-filters");
      if (moveFocus) await other.focus();
      const download = status === 200 ? page.waitForEvent("download") : undefined;
      response.release();
      if (download) expect((await download).suggestedFilename()).toMatch(/^technologies_export_.*\.xlsx$/);
      else await expect(page.getByText("Une erreur est survenue lors de l'exportation Excel. Veuillez réessayer.")).toBeVisible();
      await expect(exportButton).toHaveAttribute("aria-disabled", "false");
      await expect(moveFocus ? other : exportButton).toBeFocused();
    });
  }
}

test("F3 nom puis date : erreurs associées, ordre du focus, valeurs conservées et correction", async ({ page }) => {
  await open(page, "quality");
  await page.getByTestId("admin-quality-campaign-edit-btn").click();
  const dialog = page.getByTestId("admin-edit-quality-campaign-modal");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("champs obligatoires");
  const name = await input(page, "quality-campaign-name");
  const start = await input(page, "quality-campaign-start-date");
  const message = await input(page, "quality-campaign-message");
  const save = page.getByTestId("admin-quality-campaign-save-btn");
  let saves = 0;
  await page.route(campaignApi, async (route) => {
    saves += 1;
    await route.fulfill({ json: campaign });
  });
  await message.fill("Saisie conservée");
  await name.fill("");
  await start.fill("");
  await save.press("Enter");
  await expectInvalid(name, "Le nom de la campagne est requis.");
  expect(saves).toBe(0);
  await name.fill("Nom corrigé");
  await save.press("Enter");
  await expectInvalid(start, "La date de début est requise.");
  await expect(name).toHaveValue("Nom corrigé");
  await expect(message).toHaveValue("Saisie conservée");
  expect(saves).toBe(0);
  await start.fill("2026-11-23");
  await save.press("Enter");
  await expect(dialog).not.toBeVisible();
  expect(saves).toBe(1);
});

test("F3 sponsor invalide précède la date dans l'ordre du formulaire", async ({ page }) => {
  await open(page, "quality");
  await page.getByTestId("admin-quality-campaign-edit-btn").click();
  const start = await input(page, "quality-campaign-start-date");
  await start.fill("");
  await page.getByTestId("quality-campaign-sponsor-email-add").click();
  const sponsor = await input(page, "quality-campaign-sponsor-email-0");
  await sponsor.fill("invalide");
  await page.getByTestId("admin-quality-campaign-save-btn").press("Enter");
  await expectInvalid(sponsor, "Email invalide. Format attendu – ex : exemple@mail.fr");
  await expect(start).toHaveValue("");
  await sponsor.fill("qa@example.invalid");
  await page.getByTestId("admin-quality-campaign-save-btn").press("Enter");
  await expectInvalid(start, "La date de début est requise.");
});

test("F4 millésime : limites, entier, erreur associée et nouvel essai au clavier", async ({ page }) => {
  await open(page, "mdit");
  await page.getByTestId("admin-campaign-edit-btn").click();
  const year = await input(page, "campaign-year");
  const label = await input(page, "campaign-label");
  const save = page.getByTestId("admin-campaign-save-btn");
  let saves = 0;
  await page.route(mditApi, async (route) => {
    saves += 1;
    await route.fulfill({ json: { id: "mdit-qa", year: 2027, label: "Saisie conservée", isActive: true } });
  });
  await label.fill("Saisie conservée");
  for (const value of ["", "1999", "2101", "2026.5"]) {
    await year.fill(value);
    await save.press("Enter");
    await expectInvalid(year, "Le millésime doit être une année entre 2000 et 2100.");
    await expect(label).toHaveValue("Saisie conservée");
    expect(saves).toBe(0);
  }
  await year.fill("2027");
  await expect(year).not.toHaveAttribute("aria-invalid", "true");
  await save.press("Enter");
  await expect(page.getByTestId("admin-edit-campaign-modal")).not.toBeVisible();
  expect(saves).toBe(1);
});

for (const form of [
  {
    view: "quality",
    edit: "admin-quality-campaign-edit-btn",
    save: "admin-quality-campaign-save-btn",
    cancel: "admin-quality-campaign-cancel-btn",
    dialog: "admin-edit-quality-campaign-modal",
    api: campaignApi,
  },
  {
    view: "mdit",
    edit: "admin-campaign-edit-btn",
    save: "admin-campaign-save-btn",
    cancel: "admin-campaign-cancel-btn",
    dialog: "admin-edit-campaign-modal",
    api: mditApi,
  },
] as const) {
  for (const close of [false, true]) {
    test(`F3/F4 ${form.view} : réponse lente en erreur, fermeture=${close}`, async ({ page }) => {
      await open(page, form.view);
      const edit = page.getByTestId(form.edit);
      await edit.focus();
      await edit.press("Enter");
      const save = page.getByTestId(form.save);
      const cancel = page.getByTestId(form.cancel);
      const response = await deferredResponse(page, form.api, 500);
      await save.focus();
      await save.press("Enter");
      await expect.poll(() => response.requests.length).toBe(1);
      await expect(save).toBeDisabled();
      if (close) {
        await cancel.click();
        await expect(page.getByTestId(form.dialog)).not.toBeVisible();
        // La fermeture du FocusTrap DSFR rend d'abord le focus au déclencheur.
        // Attendre cette restitution, alors que la réponse API est toujours retenue,
        // distingue cet effet de fermeture de celui de la réponse différée.
        await expect(edit).toBeFocused();
        await page.getByTestId("outside-control").focus();
        await expect(page.getByTestId("outside-control")).toBeFocused();
      } else {
        await cancel.focus();
      }
      const completed = page.waitForResponse(form.api);
      response.release();
      await (await completed).finished();
      // Après la fermeture, le slot de DsfrModal est démonté. Attendre le rendu de
      // la réponse permet de vérifier son effet sur le focus sans chercher ce slot.
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
      if (close) {
        await expect(page.getByTestId(form.dialog)).not.toBeVisible();
        await expect(page.getByTestId("outside-control")).toBeFocused();
      } else {
        await expect(save).not.toBeDisabled();
        await expect(page.getByTestId(form.dialog)).toContainText("Erreur lors de la sauvegarde de la campagne.");
        await expect(cancel).toBeFocused();
      }
      expect(response.requests).toHaveLength(1);
    });
  }
}
