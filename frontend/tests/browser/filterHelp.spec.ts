import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 1280, height: 900 },
  { width: 375, height: 800 },
]) {
  test(`les aides restent distinctes des noms et accessibles au clavier (${viewport.width}px)`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route("**/api/v2/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith("/config"))
        await route.fulfill({
          json: { oidcConfigUrl: "https://oidc.example.invalid/.well-known/openid-configuration", oidcClientId: "qa" },
        });
      else if (path.endsWith("/mdit-campaigns"))
        await route.fulfill({ json: { results: [{ id: "campaign-qa", year: 2026, label: "Campagne 2026" }], total: 1 } });
      else await route.fulfill({ json: { results: [], total: 0 } });
    });
    await page.goto("/tests/browser/fixtures/filterHelp.html");
    if (viewport.width < 768) await page.getByRole("button", { name: "Ouvrir les filtres" }).click();
    for (const accordion of await page.locator(".fr-accordion__btn").all()) {
      await accordion.focus();
      await accordion.press("Enter");
      await expect(accordion).toHaveAttribute("aria-expanded", "true");
      await expect(accordion.locator("xpath=../following-sibling::div")).not.toHaveClass(/fr-collapsing/);
    }
    const sidebar = page.getByTestId("sidebar-filter");
    await expect(sidebar.getByRole("textbox", { name: "Nom de l’application", exact: true })).toBeVisible();
    await expect(sidebar.locator("label .fr-btn--tooltip, legend .fr-btn--tooltip")).toHaveCount(0);
    await expect(sidebar.getByRole("checkbox", { name: "Sans statut", exact: true })).toHaveAccessibleDescription(
      "Affiche uniquement les applications sans statut renseigné.",
    );
    await expect(sidebar.getByRole("checkbox", { name: "Sans hébergement", exact: true })).toHaveAccessibleDescription(
      "Affiche uniquement les applications sans hébergement renseigné.",
    );
    await expect(sidebar.getByRole("combobox", { name: "Direction métier", exact: true })).toBeVisible();
    for (const name of ["Tags", "Conformité", "Indice de qualité", "Statut de l'application", "Priorité de redémarrage"]) {
      const group = sidebar.getByRole("group", { name, exact: true });
      await expect(group).toBeVisible();
      await expect(group).toHaveAccessibleDescription(/.+/);
    }
    const helps = sidebar.locator(".fr-btn--tooltip");
    expect(await helps.count()).toBeGreaterThanOrEqual(33);
    for (const help of await helps.all()) {
      await help.scrollIntoViewIfNeeded();
      await expect(help).toBeVisible();
      await expect(help).toHaveAccessibleName(/Afficher l’aide sur/);
      await expect(help).toHaveAccessibleDescription(/.+/);
      await help.focus();
      await expect(help).toBeFocused();
      await help.press("Enter");
      const tooltipId = await help.getAttribute("aria-describedby");
      await expect(sidebar.locator(`[id="${tooltipId}"]`)).toHaveClass(/fr-tooltip--shown/);
      await help.press("Escape");
      await expect(sidebar.locator(`[id="${tooltipId}"]`)).not.toHaveClass(/fr-tooltip--shown/);
      if (await help.evaluate((button) => button.matches(".fieldset-help, .tag-search-help"))) {
        const offset = await help.evaluate((button) => {
          const legend = button.closest("fieldset")?.querySelector("legend");
          if (!legend) throw new Error("Légende absente");
          return Math.abs(button.getBoundingClientRect().top - legend.getBoundingClientRect().top);
        });
        expect(offset, (await help.getAttribute("aria-label")) ?? "Aide").toBeLessThanOrEqual(2);
      }
      const box = await help.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
    }
  });
}
