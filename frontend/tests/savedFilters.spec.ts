import { expect, test } from "@playwright/test";
import { gotoSearchPage, waitForSearchParams } from "./utils";

// Utilise un nom unique par run pour ne pas entrer en conflit avec un filtre
// laissé par une exécution précédente qui aurait échoué avant son nettoyage.
function uniqueFilterName() {
  return `Test e2e ${Date.now()}`;
}

test.describe("Application search — filtres sauvegardés", () => {
  test.beforeEach(async ({ page }) => {
    await gotoSearchPage(page);
  });

  test("sauvegarde, applique puis supprime un filtre", async ({ page }) => {
    const filterName = uniqueFilterName();

    // Active un filtre observable dans l'URL.
    await page.getByTestId("my-apps-filter-toggle").click();
    await waitForSearchParams(page, (params) => params.get("myApplications") === "true");

    // L'accordéon « Filtres sauvegardés » est replié par défaut, comme les autres.
    const saveButton = page.getByTestId("save-filter-button");
    if (!(await saveButton.isVisible())) {
      await page.getByTestId("sidebar-accordion-saved-filters").click();
    }
    await expect(saveButton).toBeVisible();

    // Sauvegarde les filtres courants sous un nom.
    await saveButton.click();
    await expect(page.getByTestId("save-filter-modal")).toBeVisible();
    await page.getByTestId("save-filter-name-input").fill(filterName);
    await page.getByTestId("confirm-save-filter-button").click();
    await expect(page.getByTestId("save-filter-modal")).toBeHidden();

    const savedItem = page.getByTestId("saved-filters-list").getByText(filterName);
    await expect(savedItem).toBeVisible();

    // Réinitialise : le filtre sauvegardé ne doit pas être affecté.
    await page.getByTestId("sidebar-reset-filters-button").click();
    await waitForSearchParams(page, (params) => !params.has("myApplications"));

    // Réapplique le filtre sauvegardé : le paramètre doit revenir dans l'URL.
    await savedItem.click();
    await waitForSearchParams(page, (params) => params.get("myApplications") === "true");

    // Supprime le filtre sauvegardé.
    const savedRow = page.getByTestId("saved-filters-list").locator("li", { hasText: filterName });
    await savedRow.locator('[data-testid^="saved-filter-delete-"]').click();
    await expect(savedItem).toBeHidden();
  });
});
