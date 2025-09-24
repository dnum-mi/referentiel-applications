import { expect, test } from "@playwright/test";

// See here how to get started:
// https://playwright.dev/docs/intro
test("visits the app root url", async ({ page }) => {
  // Go to the page and wait for it to be fully loaded
  await page.goto("/", { waitUntil: "networkidle" });

  // Wait for the element to be visible and then check its text
  await expect(page.locator("[data-testid='home-title']")).toBeVisible({ timeout: 10000 });
  await expect(page.locator("[data-testid='home-title']")).toHaveText("Le référentiel des applications", { timeout: 10000 });
});
