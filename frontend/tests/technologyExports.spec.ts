import { readFile } from "node:fs/promises";
import { expect, test, type Download, type Page } from "@playwright/test";

const authority = "https://sso.example.test";
const excelContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
// Le contenu du classeur est vérifié par les tests backend ; ici, on contrôle
// que la réponse binaire HTTP arrive intacte dans le téléchargement navigateur.
const excelBytes = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0xff, 0x80, 0x01]);

async function prepareSession(page: Page, canExport = true, beta = false) {
  await page.addInitScript(
    ({ authority }) => {
      sessionStorage.setItem(
        `oidc.user:${authority}:refapp-test`,
        JSON.stringify({
          access_token: "technology-export-test-session",
          token_type: "Bearer",
          scope: "openid profile email",
          profile: { sub: "technology-export-test-user" },
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        }),
      );
    },
    { authority },
  );

  const requests = {
    technologies: [] as URL[],
    technologyExports: [] as URL[],
    applications: [] as URL[],
    applicationExports: [] as URL[],
  };

  await page.route("**/api/v2/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/config")) {
      await route.fulfill({
        json: {
          oidcConfigUrl: `${authority}/.well-known/openid-configuration`,
          oidcClientId: "refapp-test",
          oidcScope: "openid profile email",
          version: "test",
          betaFeatures: ["catalogue-excel-export", "product-html-export", "product-powerpoint-export"],
        },
      });
    } else if (url.pathname.endsWith("/users/me")) {
      await route.fulfill({
        json: {
          id: "technology-export-test-user",
          email: "technologies@example.test",
          role: "READER",
          type: "human",
          permissions: ["AppRead", "AppList"],
          additionalPermissions: ["TechnologyList", ...(canExport ? ["DataExport"] : []), ...(beta ? ["BetaFeatures"] : [])],
          scopeOrganizationId: null,
          scopeOrganization: null,
          followedApplications: [],
          isBlocked: false,
        },
      });
    } else if (url.pathname.endsWith("/health-check")) {
      await route.fulfill({ json: { etat: "OK", maintenance: false, version: "test" } });
    } else if (url.pathname.endsWith("/technologies/end-of-life/export")) {
      requests.technologyExports.push(url);
      await route.fulfill({ contentType: excelContentType, body: excelBytes });
    } else if (url.pathname.endsWith("/technologies/end-of-life")) {
      requests.technologies.push(url);
      await route.fulfill({
        json: {
          total: 40,
          results: [
            {
              id: "technology-app",
              label: "Application PostgreSQL",
              organizationPaths: ["MI/DNUM"],
              worstStatus: "eol-soon",
              technologies: [{ id: "postgresql", technology: "Base de données", product: "PostgreSQL", version: "13", status: "eol-soon" }],
            },
          ],
        },
      });
    } else if (url.pathname.endsWith("/applications/export/excel")) {
      requests.applicationExports.push(url);
      await route.fulfill({ contentType: excelContentType, body: excelBytes });
    } else if (url.pathname.endsWith("/applications")) {
      requests.applications.push(url);
      await route.fulfill({ json: { results: [], total: 0, averageIq: 0 } });
    } else {
      await route.fulfill({ json: url.pathname.endsWith("/unread-count") ? { count: 0 } : [] });
    }
  });
  return requests;
}

async function expectExcelDownload(download: Download, filename: RegExp) {
  expect(download.suggestedFilename()).toMatch(filename);
  expect(await download.failure()).toBeNull();
  const path = await download.path();
  if (!path) throw new Error("Le navigateur n'a pas enregistré le fichier Excel.");
  expect(await readFile(path)).toEqual(excelBytes);
}

test("l'export Technologies conserve filtres et tri et télécharge toutes les pages", async ({ page }) => {
  const requests = await prepareSession(page);
  await page.goto("/technologies");
  await expect(page.getByTestId("end-of-life-table")).toContainText("PostgreSQL 13");

  await page.getByTestId("end-of-life-filter-status").selectOption("eol-soon");
  await page.getByRole("textbox", { name: "Organisation", exact: true }).fill(" MI/DNUM ");
  await page.getByRole("textbox", { name: "Recherche", exact: true }).fill(" PostgreSQL ");
  await expect
    .poll(() => {
      const params = requests.technologies.at(-1)?.searchParams;
      return [params?.get("status"), params?.get("organization"), params?.get("search")];
    })
    .toEqual(["eol-soon", "MI/DNUM", "PostgreSQL"]);

  await page.getByTestId("end-of-life-table").getByRole("button", { name: "Application", exact: true }).click();
  await expect.poll(() => requests.technologies.at(-1)?.searchParams.get("order")).toBe("desc");
  const secondPage = page.getByRole("button", { name: "Page 2 sur 3", exact: true });
  await secondPage.click();
  await expect.poll(() => requests.technologies.at(-1)?.searchParams.get("page")).toBe("1");
  await expect(secondPage).toHaveAttribute("aria-current", "page");

  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("end-of-life-export-excel").click();
  await expectExcelDownload(await downloadPromise, /^technologies_export_\d{4}-\d{2}-\d{2}\.xlsx$/);
  expect(requests.technologyExports).toHaveLength(1);
  expect(Object.fromEntries(requests.technologyExports[0].searchParams)).toEqual({
    status: "eol-soon",
    organization: "MI/DNUM",
    search: "PostgreSQL",
    sortBy: "label",
    order: "desc",
  });
});

test("la consultation Technologies sans DataExport ne propose aucun téléchargement", async ({ page }) => {
  const requests = await prepareSession(page, false);
  await page.goto("/technologies");
  await expect(page.getByTestId("end-of-life-table")).toContainText("PostgreSQL 13");
  await expect(page.getByTestId("end-of-life-export-excel")).toHaveCount(0);
  expect(requests.technologyExports).toEqual([]);
});

test("le filtre de fin de vie du catalogue est partagé par l'URL, la recherche et l'export", async ({ page }) => {
  const requests = await prepareSession(page, true, true);
  await page.goto("/recherche-application?page=2&technologyEolStatus=eol");
  const filter = page.getByTestId("technology-filter-eol-status");
  if (!(await filter.isVisible())) {
    await page.getByTestId("sidebar-accordion-technologies").getByRole("button").click();
  }
  await expect(filter).toHaveValue("eol");

  await filter.selectOption("eoas-passed");
  await expect(page).toHaveURL((url) => url.searchParams.get("technologyEolStatus") === "eoas-passed" && !url.searchParams.has("page"));
  await expect.poll(() => requests.applications.at(-1)?.searchParams.get("technologyEolStatus")).toBe("eoas-passed");

  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("application-export-btn").click();
  await expectExcelDownload(await downloadPromise, /^applications_export_\d{4}-\d{2}-\d{2}\.xlsx$/);
  expect(requests.applicationExports).toHaveLength(1);
  expect(requests.applicationExports[0].searchParams.get("technologyEolStatus")).toBe("eoas-passed");

  await page.getByTestId("sidebar-reset-filters-button").click();
  await expect(filter).toHaveValue("");
  await expect(page).toHaveURL((url) => !url.searchParams.has("technologyEolStatus"));
  await expect.poll(() => requests.applications.at(-1)?.searchParams.has("technologyEolStatus")).toBe(false);
});
