import { expect, test, type Page } from "@playwright/test";

// Contrat navigateur avec réponses API contrôlées. Les tests Supertest couvrent
// séparément le middleware réel ; ces fixtures ne qualifient pas Passage2.
const authority = "https://sso.example.test";
const storageKey = `oidc.user:${authority}:refapp-test`;
const weak = {
  statusCode: 403,
  strongAuthRequired: true,
  authLevel: { level: "weak", downgraded: true, reason: "weak-method" },
};

async function prepareSession(page: Page) {
  await page.addInitScript(
    ({ storageKey }) => {
      if (!sessionStorage.getItem(storageKey)) {
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({
            access_token: "test-session",
            token_type: "Bearer",
            scope: "openid profile email",
            profile: { sub: "test-user" },
            expires_at: Math.floor(Date.now() / 1000) + 3600,
          }),
        );
      }
    },
    { storageKey },
  );
}

test("ne monte aucune vue protégée pendant la vérification, ni après le refus ou F5", async ({ page }, testInfo) => {
  await prepareSession(page);
  let resolveMe!: () => void;
  const pending = new Promise<void>((resolve) => {
    resolveMe = resolve;
  });
  const businessRequests: string[] = [];
  await page.route("**/api/v2/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/config")) {
      await route.fulfill({
        json: {
          oidcConfigUrl: `${authority}/.well-known/openid-configuration`,
          oidcClientId: "refapp-test",
          oidcScope: "openid profile email",
          version: "test",
          authLevel: { reauth: { strategy: "prompt", prompt: "login" } },
        },
      });
    } else if (path.endsWith("/health-check")) {
      await route.fulfill({ json: { etat: "OK", maintenance: false, version: "test" } });
    } else if (path.endsWith("/users/me")) {
      await pending;
      await route.fulfill({ status: 403, json: weak });
    } else {
      businessRequests.push(path);
      await route.fulfill({ json: [] });
    }
  });
  await page.goto("/recherche-application");
  await expect(page.getByTestId("access-verification")).toBeVisible();
  await expect(page.getByTestId("main-navigation")).toHaveCount(0);
  await expect(page.getByTestId("application-search-title")).toHaveCount(0);
  resolveMe();
  await expect(page.getByRole("heading", { name: "Authentification forte requise", exact: true })).toBeVisible();
  await expect(page.getByTestId("application-search-title")).toHaveCount(0);
  await expect(page.getByTestId("main-navigation")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Mon profil", exact: true })).toHaveCount(0);
  await expect(page.getByTestId("weak-auth-reauth-btn")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("authentification-forte.png"), fullPage: true });
  await page.evaluate(() => sessionStorage.setItem("strongReauthAttempt", "prompt"));
  await page.reload();
  await expect(page.getByTestId("weak-auth-reauth-btn")).toHaveText("Se déconnecter puis se reconnecter");
  await expect(page.getByTestId("main-navigation")).toHaveCount(0);
  expect(businessRequests).toEqual([]);
  await expect(page).toHaveURL(/\/recherche-application$/);
});

test("retire les données déjà affichées au renouvellement vers une session faible", async ({ page }) => {
  await prepareSession(page);
  let authenticationModuleUrl = "";
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/src/services/authentication.ts") authenticationModuleUrl = request.url();
  });
  let strong = true;
  await page.route("**/api/v2/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/config")) {
      await route.fulfill({
        json: {
          oidcConfigUrl: `${authority}/.well-known/openid-configuration`,
          oidcClientId: "refapp-test",
          oidcScope: "openid profile email",
          version: "test",
          authLevel: { reauth: { strategy: "prompt", prompt: "login" } },
        },
      });
    } else if (path.endsWith("/health-check")) {
      await route.fulfill({ json: { etat: "OK", maintenance: false, version: "test" } });
    } else if (path.endsWith("/users/me")) {
      await route.fulfill(
        strong
          ? {
              json: {
                id: "test-user",
                email: "donnee-privee@example.test",
                role: "ADMIN",
                type: "human",
                permissions: [],
                additionalPermissions: [],
                followedApplications: [],
                emailNotificationsEnabled: false,
                authLevel: { level: "strong", downgraded: false, reason: "strong-method" },
              },
            }
          : { status: 403, json: weak },
      );
    } else {
      await route.fulfill({ json: path.endsWith("/unread-count") ? { count: 0 } : [] });
    }
  });
  await page.goto("/profil");
  await expect(page.getByTestId("user-profile-email")).toHaveText("donnee-privee@example.test");
  strong = false;
  // Événement réel du UserManager, comme lors du renouvellement silencieux.
  expect(authenticationModuleUrl).not.toBe("");
  await page.evaluate(async (moduleUrl) => {
    // Réutiliser l'URL exacte chargée par Vite, y compris son éventuel timestamp HMR.
    const { USER_MANAGER }: typeof import("../src/services/authentication") = await import(/* @vite-ignore */ moduleUrl);
    const user = await USER_MANAGER.getUser();
    if (!user) throw new Error("La session de test doit être chargée");
    await USER_MANAGER.events.load(user);
  }, authenticationModuleUrl);
  await expect(page.getByTestId("weak-auth-banner")).toBeVisible();
  await expect(page.getByTestId("user-profile")).toHaveCount(0);
  await expect(page.getByTestId("main-navigation")).toHaveCount(0);
  await expect(page.getByText("donnee-privee@example.test", { exact: true })).toHaveCount(0);
  await expect(page.getByTestId("app-toaster")).toHaveCount(0);
  strong = true;
  await page.reload();
  await expect(page.getByTestId("user-profile-email")).toHaveText("donnee-privee@example.test");
  await expect(page.getByTestId("weak-auth-banner")).toHaveCount(0);
});
