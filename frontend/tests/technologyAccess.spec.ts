import { expect, test, type Page } from "@playwright/test";

// Le contrat HTTP et les périmètres réels sont couverts par technology-access.e2e-spec.ts.
// Ici, le navigateur vérifie menu, adresse directe, plan du site et filtre initial.
const authority = "https://sso.example.test";

async function prepareSession(page: Page, role: string, capacity: boolean) {
  await page.addInitScript(
    ({ authority }) => {
      sessionStorage.setItem(
        `oidc.user:${authority}:refapp-test`,
        JSON.stringify({
          access_token: "technology-test-session",
          token_type: "Bearer",
          scope: "openid profile email",
          profile: { sub: "technology-test-user" },
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        }),
      );
    },
    { authority },
  );
  const technologyRequests: string[] = [];
  await page.route("**/api/v2/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/config")) {
      await route.fulfill({
        json: {
          oidcConfigUrl: `${authority}/.well-known/openid-configuration`,
          oidcClientId: "refapp-test",
          oidcScope: "openid profile email",
          version: "test",
        },
      });
    } else if (url.pathname.endsWith("/users/me")) {
      await route.fulfill({
        json: {
          id: "technology-test-user",
          email: "technologies@example.test",
          role,
          type: "human",
          permissions: ["AppRead", "AppList"],
          additionalPermissions: capacity ? ["TechnologyList"] : [],
          scopeOrganizationId: null,
          scopeOrganization: null,
          followedApplications: [],
          isBlocked: false,
        },
      });
    } else if (url.pathname.endsWith("/health-check")) {
      await route.fulfill({ json: { etat: "OK", maintenance: false, version: "test" } });
    } else if (url.pathname.endsWith("/technologies/end-of-life")) {
      technologyRequests.push(url.searchParams.get("status") ?? "");
      await route.fulfill({
        json: {
          total: 1,
          results: [
            {
              id: "technology-app",
              label: "Application avec technologie saine",
              organizationPaths: ["MI/DNUM"],
              worstStatus: null,
              technologies: [{ id: "healthy", technology: "Runtime", product: "Node.js", version: "22", status: null }],
            },
          ],
        },
      });
    } else {
      await route.fulfill({ json: url.pathname.endsWith("/unread-count") ? { count: 0 } : [] });
    }
  });
  return technologyRequests;
}

for (const role of ["READER", "CONTRIBUTOR", "ADMIN"]) {
  test(`${role} sans capacité : menu, adresse directe et plan du site refusent Technologies`, async ({ page }) => {
    const requests = await prepareSession(page, role, false);
    await page.goto("/fins-de-vie");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId("main-navigation")).toBeVisible();
    await expect(page.getByTestId("main-navigation").getByRole("link", { name: "Technologies", exact: true })).toHaveCount(0);
    await expect(page.getByTestId("end-of-life-page-title")).toHaveCount(0);
    await page.goto("/plan-du-site");
    await expect(page.getByRole("link", { name: "Technologies", exact: true })).toHaveCount(0);
    expect(requests).toEqual([]);
  });

  test(`${role} avec capacité : toutes les technologies sont sélectionnées dès l'ouverture`, async ({ page }) => {
    const requests = await prepareSession(page, role, true);
    await page.goto("/fins-de-vie");
    await expect(page.getByTestId("end-of-life-page-title")).toHaveText("Technologies");
    await expect(page.getByTestId("main-navigation").getByRole("link", { name: "Technologies", exact: true })).toBeVisible();
    await expect(page.getByTestId("end-of-life-filter-status")).toHaveValue("all");
    await expect(page.getByTestId("end-of-life-table")).toContainText("Node.js 22");
    expect(requests[0]).toBe("all");
    await page.getByTestId("end-of-life-filter-status").selectOption("eol");
    await expect.poll(() => requests.at(-1)).toBe("eol");
    await page.getByTestId("end-of-life-clear-filters").click();
    await expect(page.getByTestId("end-of-life-filter-status")).toHaveValue("all");
    await expect.poll(() => requests.at(-1)).toBe("all");
  });
}

test("un profil standard avec capacité n'obtient pas de vue globale", async ({ page }) => {
  const requests = await prepareSession(page, "VISITOR", true);
  await page.goto("/fins-de-vie");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("end-of-life-page-title")).toHaveCount(0);
  expect(requests).toEqual([]);
});
