import { test, expect } from "@playwright/test";
import { BASE_URL, login } from "./utils";

test.describe("Admin - Label Sources", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/administration`);

    const labelSourceTab = page.getByRole("tab", { name: "Gestions des sources" });
    await expect(labelSourceTab).toBeVisible();
    await labelSourceTab.click();

    await expect(page.getByTestId("panel-label-sources")).toBeVisible();
  });

  test("loads admin label sources page", async ({ page }) => {
    await expect(page.getByTestId("admin-label-sources-title")).toBeVisible();
    await expect(page.getByTestId("admin-label-sources-table")).toBeVisible();
  });

  test("creates a label source", async ({ page }) => {
    const createBtn = page.getByTestId("admin-create-label-source-btn");
    await createBtn.click();

    const [response] = await Promise.all([
      page.waitForResponse((resp) => resp.url().includes("/api/v2/label-sources") && resp.request().method() === "POST"),
      page.getByTestId("label-source-source").fill(`E2E_TEST_SOURCE_${Date.now()}`),
      page.getByTestId("admin-save-perms-btn").click(),
    ]);

    expect(response.status()).toBe(201);
  });

  test("edits a label source", async ({ page }) => {
    const firstEditBtn = page.getByTestId("admin-label-source-edit-btn").first();

    const [response] = await Promise.all([
      page.waitForResponse((resp) => resp.url().includes("/api/v2/label-sources/") && resp.request().method() === "PATCH"),
      firstEditBtn.click(),
      page.getByTestId("label-source-source").fill(`E2E_UPDATED_SOURCE_${Date.now()}`),
      page.getByTestId("admin-save-perms-btn").click(),
    ]);

    expect(response.status()).toBe(200);
  });

  test("deletes a label source", async ({ page }) => {
    const firstDeleteBtn = page.getByTestId("admin-label-source-delete-btn").first();

    const [response] = await Promise.all([
      page.waitForResponse((resp) => resp.url().includes("/api/v2/label-sources/") && resp.request().method() === "DELETE"),
      firstDeleteBtn.click(),
      page.getByTestId("admin-delete-confirm-btn").click(),
    ]);

    expect(response.status()).toBe(204);
  });

  test("filters label sources with search", async ({ page }) => {
    const [response] = await Promise.all([
      page.waitForResponse((resp) => resp.request().method() === "GET" && resp.url().includes("/api/v2/label-sources")),
      page.getByTestId("admin-label-source-search").locator("input").fill("E2E"),
    ]);

    expect(response.status()).toBe(200);

    await expect(page.getByTestId("admin-label-sources-table")).toBeVisible();
  });
});
