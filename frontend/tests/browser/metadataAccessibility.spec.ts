import { expect, test, type Locator, type Page } from "@playwright/test";

const metadataApi = /\/api\/v2\/metadatas(?:\?.*)?$/;
const oneResult = {
  results: [
    {
      id: "metadata-1",
      applicationId: null,
      createdAt: "2026-10-13T10:00:00.000Z",
      action: "update",
      description: "Modification fictive",
      createdBy: { id: "user-1", email: "fictif@example.invalid", organization: null },
      impersonator: null,
    },
  ],
  total: 1,
};
const noResults = { results: [], total: 0 };

async function openHistory(page: Page) {
  const requests: URL[] = [];
  await page.route(metadataApi, async (route) => {
    requests.push(new URL(route.request().url()));
    await route.fulfill({ json: oneResult });
  });
  await page.goto("/tests/browser/fixtures/metadata.html");
  await expect(page.getByTestId("history-table")).toBeVisible();
  await expect(page.getByTestId("history-apply-filters")).toHaveAttribute("aria-disabled", "false");
  expect(requests).toHaveLength(1);
  return requests;
}

async function enterPartialDate(input: Locator) {
  await input.fill("2026-05-23T14:30");
  // Effacer un segment du sélecteur natif : value devient vide, mais badInput reste vrai.
  await input.press("Home");
  await input.press("Delete");
  expect(await input.inputValue()).toBe("");
  expect(await input.evaluate((element: HTMLInputElement) => element.validity.badInput)).toBe(true);
}

for (const field of [
  { id: "history-date-from", label: "Date de début" },
  { id: "history-date-to", label: "Date de fin" },
]) {
  for (const submission of ["Appliquer", "Entrée"]) {
    test(`${field.label} partielle : erreur accessible et aucune recherche par ${submission}`, async ({ page }) => {
      const requests = await openHistory(page);
      const input = page.locator(`#${field.id}`);
      await enterPartialDate(input);
      if (submission === "Appliquer") await page.getByTestId("history-apply-filters").click();
      else await input.press("Enter");

      const message = `${field.label} – veuillez saisir une date et une heure valides, exemple : 23/05/2026 14:30`;
      await expect(page.getByText(message, { exact: true })).toBeVisible();
      await expect(input).toHaveAttribute("aria-invalid", "true");
      await expect(input).toHaveAccessibleDescription(message);
      await expect(input).toBeFocused();
      expect(requests).toHaveLength(1);
    });
  }
}

test("Effacer supprime les segments invalides et relance une recherche sans dates", async ({ page }) => {
  const requests = await openHistory(page);
  const from = page.locator("#history-date-from");
  const to = page.locator("#history-date-to");
  await enterPartialDate(from);
  await enterPartialDate(to);
  await page.getByTestId("history-apply-filters").click();
  await expect(from).toHaveAttribute("aria-invalid", "true");
  await page.getByTestId("history-clear-filters").click();

  await expect(page.getByTestId("history-table-region")).toBeFocused();
  await expect(page.getByTestId("history-results-status")).toHaveText("1 résultat(s)");
  expect(requests).toHaveLength(2);
  for (const input of [from, to]) {
    await expect(input).toHaveValue("");
    await expect(input).not.toHaveAttribute("aria-invalid", "true");
    expect(await input.evaluate((element: HTMLInputElement) => element.validity.valid)).toBe(true);
  }
  expect(requests[1].searchParams.has("createdAtGte")).toBe(false);
  expect(requests[1].searchParams.has("createdAtLte")).toBe(false);
});

test("sans résultat, annonce le nombre et focalise la région persistante", async ({ page }) => {
  await openHistory(page);
  await page.route(metadataApi, (route) => route.fulfill({ json: noResults }));
  await page.getByTestId("history-apply-filters").click();
  await expect(page.getByTestId("history-table-region")).toBeFocused();
  await expect(page.getByTestId("history-table-region")).toContainText("Aucune donnée recensée.");
  await expect(page.getByTestId("history-results-status")).toHaveText("0 résultat(s)");
});

test("respecte le focus déplacé pendant une recherche sans résultat", async ({ page }) => {
  await openHistory(page);
  let release!: () => void;
  const responseReady = new Promise<void>((resolve) => (release = resolve));
  await page.route(metadataApi, async (route) => {
    await responseReady;
    await route.fulfill({ json: noResults });
  });
  await page.getByTestId("history-apply-filters").click();
  await expect(page.getByTestId("history-apply-filters")).toHaveAttribute("aria-disabled", "true");
  const to = page.locator("#history-date-to");
  await to.focus();
  release();
  await expect(page.getByTestId("history-results-status")).toHaveText("0 résultat(s)");
  await expect(to).toBeFocused();
});
