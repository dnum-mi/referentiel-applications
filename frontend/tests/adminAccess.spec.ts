import { test, expect } from "@playwright/test";
import { BASE_URL, keycloakData, login } from "./utils";

test.describe("Authorization — Admin page access", () => {
  test("Non-admin cannot access admin page", async ({ page }) => {
    await login(page, keycloakData);

    await page.goto(`${BASE_URL}/administration`);

    await expect(page).toHaveURL(`${BASE_URL}/`);
  });
});
