import { expect, test } from "@playwright/test";
import { BASE_URL, gotoSearchPage, login } from "./utils";

test("saisie en création : retour arrière, reprise et abandon", async ({ page }) => {
  await gotoSearchPage(page);
  await page.getByRole("button", { name: "Créer une application", exact: true }).click();
  await page.getByTestId("application-label").fill("Saisie conservée");
  await page.evaluate(() => history.back());
  await expect(page.getByTestId("application-cancel-modal")).toBeVisible();
  await page.getByTestId("application-cancel-modal-close").click();
  await expect(page.getByTestId("application-label")).toHaveValue("Saisie conservée");
  await expect(page).toHaveURL(/applications\/creer/);
  await page.getByTestId("application-cancel-btn").click();
  await page.getByTestId("application-cancel-modal-confirm").click();
  await expect(page).toHaveURL(/recherche-application/);
  await expect(page.getByTestId("application-cancel-modal")).toBeHidden();
});

test("saisie en création : confirmation native du rechargement", async ({ page }) => {
  await login(page);
  await page.goto(`${BASE_URL}/applications/creer`);
  await page.getByTestId("application-label").fill("Saisie conservée");
  const dialogPromise = page.waitForEvent("dialog");
  await page.evaluate(() => {
    setTimeout(() => location.reload(), 0);
  });
  const dialog = await dialogPromise;
  expect(dialog.type()).toBe("beforeunload");
  await dialog.dismiss();
  await expect(page.getByTestId("application-label")).toHaveValue("Saisie conservée");
  await page.getByTestId("application-label").fill("");
  page.on("dialog", () => {
    throw new Error("Un formulaire restauré ne doit pas demander confirmation");
  });
  await page.reload();
  await expect(page.getByTestId("application-label")).toHaveValue("");
});

test("saisie en édition : fermeture, Échap, focus, échec puis succès", async ({ page }) => {
  await gotoSearchPage(page);
  await page.locator('a[href^="/applications/"]:not([href="/applications/creer"])').first().click();
  await page.getByTestId("info-edit-btn").click();
  const label = page.getByTestId("application-label");
  const original = await label.inputValue();
  await label.fill(`${original} modifiée`);
  await page.getByTestId("info-edit-modal").getByRole("button", { name: "Fermer", exact: true }).click();
  const confirmation = page.getByTestId("application-cancel-modal");
  await expect(confirmation).toBeVisible();
  await confirmation.getByTestId("application-cancel-modal-close").focus();
  await page.keyboard.press("Escape");
  await expect(confirmation).toBeHidden();
  await expect(page.getByTestId("info-edit-modal")).toBeVisible();
  await expect(label).toHaveValue(`${original} modifiée`);
  await expect(page.getByTestId("info-edit-modal").getByRole("button", { name: "Fermer", exact: true })).toBeFocused();

  // Intercepter la mutation évite de modifier les données partagées de recette.
  await page.route("**/applications/*", async (route) => {
    if (route.request().method() !== "PATCH") return route.fallback();
    await route.fulfill({ status: 500, json: { message: "Échec simulé" } });
  });
  await page.getByTestId("application-submit-btn").click();
  await expect(page.getByTestId("application-save-error")).toContainText("Échec simulé");
  await page.getByTestId("application-cancel-btn").click();
  await expect(confirmation).toBeVisible();
  await page.getByTestId("application-cancel-modal-close").click();
  await page.route("**/applications/*", async (route) => {
    if (route.request().method() !== "PATCH") return route.fallback();
    await route.fulfill({
      status: 200,
      json: { ...route.request().postDataJSON(), id: new URL(route.request().url()).pathname.split("/").pop() },
    });
  });
  await page.getByTestId("application-submit-btn").click();
  await expect(page.getByTestId("info-edit-modal")).toBeHidden();
  await expect(page.getByTestId("info-edit-btn")).toBeFocused();
  await page.getByTestId("info-edit-btn").click();
  await expect(label).toHaveValue(original);
  await page.getByTestId("application-cancel-btn").click();
  await expect(page.getByTestId("info-edit-modal")).toBeHidden();
});
