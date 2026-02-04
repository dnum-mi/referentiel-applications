import { expect, test } from "@playwright/test";

// See here how to get started:
// https://playwright.dev/docs/intro
test("visits the app root url", async ({ page }) => {
  await page.goto("/");

  const homeTitle = page.locator("[data-testid='home-title']");
  await expect(homeTitle).toBeVisible();
  await expect(homeTitle).toHaveText("Le référentiel des applications");
});
