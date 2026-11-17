import { expect, test, type Page } from "@playwright/test";

const notificationsApi = /\/api\/v2\/notifications(?:\?.*)?$/;
const notification = {
  id: "notification-1",
  type: "report_created",
  message: "Signalement fictif créé",
  link: null,
  applicationId: null,
  createdAt: "2026-11-17T09:00:00.000Z",
  isRead: true,
};
const oneResult = { results: [notification], total: 1 };
const noResults = { results: [], total: 0 };

async function openNotifications(page: Page, empty = false) {
  await page.route(notificationsApi, (route) => route.fulfill({ json: empty ? noResults : oneResult }));
  await page.goto("/tests/browser/fixtures/notifications.html");
  await expect(page.getByTestId("notifications-results-status")).toHaveText(`${empty ? 0 : 1} notification(s)`);
}

test("annonce un filtrage sans résultat en conservant le focus et le message vide statique", async ({ page }) => {
  await openNotifications(page);
  const status = page.getByTestId("notifications-results-status");
  await expect(status).toHaveAttribute("role", "status");
  await expect(status).toHaveAttribute("aria-atomic", "true");
  await page.route(notificationsApi, (route) => route.fulfill({ json: noResults }));

  const filter = page.getByRole("combobox", { name: "Type d’événement" });
  await filter.focus();
  await filter.selectOption("actor_added");

  await expect(status).toHaveText("0 notification(s)");
  await expect(filter).toBeFocused();
  const emptyMessage = page.getByText("Aucune notification pour ce type d’événement.", { exact: true });
  await expect(emptyMessage).toBeVisible();
  expect(await emptyMessage.evaluate((element) => element.closest('output, [role="status"], [aria-live]') !== null)).toBe(false);
});

test("renouvelle l’annonce de zéro résultat entre deux types sans notification", async ({ page }) => {
  await openNotifications(page, true);
  const status = page.getByTestId("notifications-results-status");
  const statusElement = await status.elementHandle();
  let release!: () => void;
  const responseReady = new Promise<void>((resolve) => (release = resolve));
  await page.route(notificationsApi, async (route) => {
    await responseReady;
    await route.fulfill({ json: noResults });
  });
  const filter = page.getByRole("combobox", { name: "Type d’événement" });
  await filter.focus();
  const requested = page.waitForRequest(notificationsApi);
  await filter.selectOption("actor_added");
  await requested;
  await expect(status).toBeEmpty();
  release();

  await expect(status).toHaveText("0 notification(s)");
  expect(
    await statusElement?.evaluate((element) => element === document.querySelector('[data-testid="notifications-results-status"]')),
  ).toBe(true);
  await expect(filter).toBeFocused();
});

test("n’annonce pas de résultat réussi après un refus HTTP", async ({ page }) => {
  await openNotifications(page);
  await page.route(notificationsApi, (route) => route.fulfill({ status: 500, json: { message: "Indisponible" } }));
  const filter = page.getByRole("combobox", { name: "Type d’événement" });
  await filter.focus();
  const response = page.waitForResponse((result) => notificationsApi.test(result.url()) && result.status() === 500);
  await filter.selectOption("actor_added");
  await response;

  await expect(page.getByTestId("notifications-table").locator("[aria-busy]")).toHaveAttribute("aria-busy", "false");
  await expect(page.getByTestId("notifications-results-status")).toBeEmpty();
  await expect(page.getByTestId("notification-row-message")).toHaveText(notification.message);
  await expect(filter).toBeFocused();
});

test("conserve l’annonce et les résultats du dernier filtre quand une ancienne réponse arrive ensuite", async ({ page }) => {
  await openNotifications(page);
  let release!: () => void;
  const responseReady = new Promise<void>((resolve) => (release = resolve));
  const twoResults = {
    results: [notification, { ...notification, id: "notification-2", message: "Deuxième notification fictive" }],
    total: 2,
  };
  await page.route(notificationsApi, async (route) => {
    if (new URL(route.request().url()).searchParams.get("type") === "actor_added") {
      await responseReady;
      await route.fulfill({ json: noResults });
    } else {
      await route.fulfill({ json: twoResults });
    }
  });
  const filter = page.getByRole("combobox", { name: "Type d’événement" });
  await filter.focus();
  const requested = page.waitForRequest((request) => new URL(request.url()).searchParams.get("type") === "actor_added");
  await filter.selectOption("actor_added");
  await requested;
  await filter.selectOption("report_created");
  await expect(page.getByTestId("notifications-results-status")).toHaveText("2 notification(s)");

  const oldResponse = page.waitForResponse((response) => new URL(response.url()).searchParams.get("type") === "actor_added");
  release();
  await (await oldResponse).finished();
  await expect(page.getByTestId("notifications-results-status")).toHaveText("2 notification(s)");
  await expect(page.getByTestId("notification-row-message")).toHaveCount(2);
  await expect(filter).toBeFocused();
});
