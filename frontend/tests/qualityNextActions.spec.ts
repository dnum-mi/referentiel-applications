import { expect, test } from "@playwright/test";
import { gotoSearchPage } from "./utils";

const IMPACT_LABELS = ["Impact fort", "Impact moyen", "Impact secondaire"];

test.describe("Fiche application — prochaines actions pour l'IQ", () => {
  test.beforeEach(async ({ page }) => {
    await gotoSearchPage(page);
    const firstRowLink = page.getByTestId("application-table").locator("tbody tr:first-child a").first();
    await expect(firstRowLink).toBeVisible();
    const href = await firstRowLink.getAttribute("href");

    // Navigue directement sur l'onglet Qualité (le rechargement complet laisse le temps
    // à l'app de s'hydrater avant qu'on interroge le DOM).
    await page.goto(`${href}/tab-quality`);
    await expect(page.getByTestId("application-tab-content-tab-quality")).toBeVisible();
    await expect(page.getByTestId("quality-next-actions")).toBeVisible();
  });

  test("n'affiche jamais de score ou de nombre de points par critère", async ({ page }) => {
    const panel = page.getByTestId("quality-next-actions");
    const text = await panel.innerText();

    // Seuls les libellés qualitatifs d'impact sont autorisés — aucun delta de points
    // (le barème de calculateIQ est dégressif par palier, pas additif : un chiffre par
    // critère serait trompeur).
    const withoutImpactLabels = IMPACT_LABELS.reduce((acc, label) => acc.replaceAll(label, ""), text);
    expect(withoutImpactLabels).not.toMatch(/[+-]?\d+\s*(points?|pts|%)/i);
  });

  test("liste les actions restantes (sinon un message de complétude), jamais les deux", async ({ page }) => {
    const list = page.getByTestId("quality-next-actions-list");
    const complete = page.getByTestId("quality-next-actions-complete");

    const hasList = await list.isVisible().catch(() => false);
    const hasComplete = await complete.isVisible().catch(() => false);

    expect(hasList).not.toBe(hasComplete);

    if (hasList) {
      const items = list.locator("li");
      await expect(items.first()).toBeVisible();
      for (const item of await items.all()) {
        await expect(item.locator(".fr-badge")).toHaveText(new RegExp(IMPACT_LABELS.join("|"), "i"));
      }
    }
  });

  test("cliquer sur une action ouvre l'onglet correspondant", async ({ page }) => {
    const firstAction = page.getByTestId("quality-next-actions-list").locator("a").first();
    if (!(await firstAction.isVisible().catch(() => false))) {
      test.skip(true, "Aucune action restante pour cette application — rien à cliquer.");
      return;
    }

    const href = await firstAction.getAttribute("href");
    await firstAction.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.locator(`[data-testid="application-tab-content-${href!.split("/").pop()}"]`)).toBeVisible();
  });

  test("la barre de score reflète l'IQ et annonce le nombre d'actions restantes", async ({ page }) => {
    const indexText = (await page.getByTestId("quality-index").innerText()).trim();
    const score = Number(/(\d+)%/.exec(indexText)?.[1]);
    expect(Number.isNaN(score)).toBe(false);

    const bar = page.getByTestId("quality-score-bar");
    await expect(bar).toBeVisible();
    await expect(bar.locator('[role="progressbar"]')).toHaveAttribute("aria-valuenow", String(score));

    const remainingCount = await page.getByTestId("quality-next-actions-list").locator("li").count();
    const caption = (await page.getByTestId("quality-score-caption").innerText()).trim();
    if (remainingCount === 0) {
      expect(caption).toMatch(/renseignés/i);
    } else {
      expect(caption).toContain(String(remainingCount));
    }
  });

  test("recharge les données de qualité en revenant sur l'onglet (mise en cache par KeepAlive)", async ({ page }) => {
    let requestCount = 0;
    page.on("request", (req) => {
      if (req.url().includes("/quality-summary")) requestCount++;
    });

    await page.reload();
    await expect(page.getByTestId("quality-next-actions")).toBeVisible();
    const afterInitialLoad = requestCount;
    expect(afterInitialLoad).toBeGreaterThan(0);

    await page.getByRole("tab", { name: "Informations générales" }).click();
    await page.getByRole("tab", { name: "Qualité" }).click();

    await expect.poll(() => requestCount).toBeGreaterThan(afterInitialLoad);
  });
});
