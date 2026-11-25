import { expect, test, type Page, type Route } from "@playwright/test";
import { authority, prepareSession } from "./utils";

const campaign = {
  id: "qa",
  name: "Campagne fictive",
  status: "scheduled",
  sponsorEmails: ["qa@example.test"],
  startDate: "2026-11-01",
  targetCount: 30,
  filters: {},
};
const targets = { results: [{ applicationId: "app", label: "Application fictive", delta: 0 }], total: 30 };
const targetsUrl = "**/quality-campaigns/qa/targets?*";
const targetsPage = "/administration/campagnes-qualite/qa/cibles";

test.beforeEach(async ({ page }) => {
  await prepareSession(page);
  await page.route("**/api/v2/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    const responses: Record<string, unknown> = {
      "/config": { oidcConfigUrl: authority, oidcClientId: "refapp-test", version: "test" },
      "/users/me": {
        id: "test-user",
        role: "READER",
        type: "human",
        additionalPermissions: ["QualityCampaignManage", "MditCampaignManage", "TechnologyList", "DataExport"],
      },
      "/health-check": { etat: "OK", maintenance: false, version: "test" },
      "/quality-campaigns": { results: [campaign], total: 1 },
      "/quality-campaigns/qa": campaign,
      "/quality-campaigns/qa/targets": targets,
      "/mdit-campaigns": { results: [], total: 0 },
      "/technologies/end-of-life": { results: [], total: 0 },
      "/notifications/unread-count": { count: 0 },
    };
    return route.fulfill({ json: responses[path.slice("/api/v2".length)] ?? [] });
  });
});

async function delayResponse(page: Page, url: string, response: Parameters<Route["fulfill"]>[0]) {
  const gate = Promise.withResolvers<void>();
  const requests: string[] = [];
  await page.route(url, async (route) => {
    requests.push(route.request().url());
    await gate.promise;
    await route.fulfill(response);
  });
  return { release: gate.resolve, requests };
}

test("Actualiser reste focalisable jusqu’à la dernière réponse et Page suivante conserve le focus", async ({ page }) => {
  await page.goto(targetsPage);
  const refresh = page.getByRole("button", { name: "Actualiser" });
  await expect(refresh).toBeEnabled();
  const details = await delayResponse(page, "**/quality-campaigns/qa", { json: campaign });
  const list = await delayResponse(page, targetsUrl, { json: targets });
  await refresh.press("Enter");
  await expect(refresh).toHaveAttribute("aria-busy", "true");
  await expect(refresh).toBeFocused();
  list.release();
  await expect(page.getByText("30 cible(s) consultable(s) pour ce filtre")).toBeVisible();
  await refresh.press("Enter");
  await expect(refresh).toHaveAttribute("aria-disabled", "true");
  details.release();
  await expect(refresh).toBeEnabled();
  await expect(refresh).toBeFocused();
  expect(list.requests).toHaveLength(1);
  expect(details.requests).toHaveLength(1);
  const next = page.getByTestId("pagination-next");
  await next.press("Enter");
  await expect(page.getByTestId("pagination-page-status")).toHaveText("Page 2 sur 2");
  await expect(next).toBeFocused();
});

for (const moveFocus of [false, true]) {
  test(`Actualiser et Réessayer après échec, déplacement volontaire = ${moveFocus}`, async ({ page }) => {
    await page.goto(targetsPage);
    const refresh = page.getByRole("button", { name: "Actualiser" });
    const retry = page.getByRole("button", { name: "Réessayer" });
    const filter = page.getByLabel("Progression", { exact: true });
    await expect(refresh).toBeEnabled();
    const failed = await delayResponse(page, targetsUrl, { status: 500, json: {} });
    await refresh.press("Enter");
    await expect(refresh).toBeFocused();
    if (moveFocus) await filter.focus();
    failed.release();
    await expect(retry).toBeVisible();
    await expect(moveFocus ? filter : refresh).toBeFocused();
    const success = await delayResponse(page, targetsUrl, { json: targets });
    await retry.press("Enter");
    await expect(retry).toHaveAttribute("aria-busy", "true");
    await expect(retry).toBeFocused();
    await retry.press("Enter");
    if (moveFocus) await filter.focus();
    success.release();
    await expect(retry).toHaveCount(0);
    await expect(moveFocus ? filter : refresh).toBeFocused();
    expect(success.requests).toHaveLength(1);
  });
}

for (const status of [200, 500]) {
  test(`export Excel au clavier avec réponse HTTP ${status}`, async ({ page }) => {
    await page.goto("/technologies");
    const button = page.getByTestId("end-of-life-export-excel");
    for (const moveFocus of [false, true]) {
      const result = await delayResponse(page, "**/end-of-life/export?*", { status, body: "export fictif" });
      await button.press("Enter");
      await expect(button).toHaveAttribute("aria-busy", "true");
      await expect(button).toHaveAttribute("aria-disabled", "true");
      await expect(button).toBeFocused();
      await button.press("Enter");
      const clear = page.getByTestId("end-of-life-clear-filters");
      if (moveFocus) {
        await clear.focus();
        await expect(clear).toBeFocused();
      }
      result.release();
      await expect(button).toBeEnabled();
      await expect(moveFocus ? clear : button).toBeFocused();
      expect(result.requests).toHaveLength(1);
    }
  });
}

test("corrige les erreurs de campagne qualité au clavier dans l’ordre des champs", async ({ page }) => {
  await page.goto("/administration?tab=tab-quality-campaigns");
  await page.getByTestId("admin-quality-campaign-edit-btn").press("Enter");
  const name = page.getByTestId("quality-campaign-name");
  const email = page.getByTestId("quality-campaign-sponsor-email-0");
  const startDate = page.getByTestId("quality-campaign-start-date");
  const save = page.getByTestId("admin-quality-campaign-save-btn");
  await name.fill("");
  await email.fill("invalide");
  await startDate.fill("");
  await page.getByTestId("quality-campaign-message").fill("À conserver");
  await save.press("Enter");
  await expect(name).toBeFocused();
  await name.fill("Nom corrigé");
  await save.press("Enter");
  await expect(email).toBeFocused();
  await email.fill(campaign.sponsorEmails[0]);
  await save.press("Enter");
  await expect(startDate).toBeFocused();
  await startDate.fill("2026-11-30");
  const request = page.waitForRequest("**/quality-campaigns/qa");
  await save.press("Enter");
  expect((await request).postDataJSON()).toMatchObject({ name: "Nom corrigé", message: "À conserver" });
  await expect(save).toBeHidden();
});

test("corrige le millésime puis ferme le dialogue MDIT pendant l’enregistrement", async ({ page }) => {
  await page.goto("/administration?tab=tab-mdit-campaigns");
  const open = page.getByTestId("admin-create-campaign-btn");
  await open.press("Enter");
  const year = page.getByTestId("campaign-year");
  const label = page.getByTestId("campaign-label");
  const save = page.getByTestId("admin-campaign-save-btn");
  await year.fill("1999");
  await label.fill("À conserver");
  await save.press("Enter");
  await expect(year).toBeFocused();
  await expect(label).toHaveValue("À conserver");
  await year.fill("2027");
  const result = await delayResponse(page, "**/mdit-campaigns", { json: { id: "qa", year: 2027 } });
  await save.press("Enter");
  await expect(save).toBeDisabled();
  await page.getByTestId("admin-campaign-cancel-btn").press("Enter");
  await expect(save).toBeHidden();
  await expect(open).toBeFocused();
  result.release();
  await expect(page.getByText("Campagne créée avec succès")).toBeVisible();
  await expect(open).toBeFocused();
});
