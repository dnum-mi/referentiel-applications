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

async function prepareSession(page: Page, profile: Record<string, string> = {}) {
  await page.addInitScript(
    ({ storageKey, profile }) => {
      if (!sessionStorage.getItem(storageKey)) {
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({
            access_token: "test-session",
            token_type: "Bearer",
            scope: "openid profile email",
            profile: { sub: "test-user", ...profile },
            expires_at: Math.floor(Date.now() / 1000) + 3600,
          }),
        );
      }
    },
    { storageKey, profile },
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
  // Le refus global peut apparaître avant la fin de la navigation ; afterEach pose ce titre.
  await expect(page).toHaveTitle("Recherche d'applications - Référentiel des applications");
  await page.screenshot({ path: testInfo.outputPath("authentification-forte.png"), fullPage: true });
  await page.evaluate(() => sessionStorage.setItem("strongReauthAttempt", "prompt"));
  await page.reload();
  await expect(page.getByTestId("weak-auth-reauth-btn")).toHaveText("Se déconnecter puis se reconnecter");
  await expect(page.getByTestId("main-navigation")).toHaveCount(0);
  expect(businessRequests).toEqual([]);
  await expect(page).toHaveURL(/\/recherche-application$/);
});

test("retire les données déjà affichées au renouvellement vers une session faible", async ({ page }) => {
  await prepareSession(page, { iss: authority, sid: "session-1" });
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

for (const changedIdentity of [false, true]) {
  test(
    changedIdentity
      ? "abandonne la saisie si la revalidation renvoie une autre identité effective"
      : "conserve la saisie et le focus pendant le renouvellement de la même session",
    async ({ page }) => {
      await prepareSession(page, { iss: authority, sid: "session-1" });
      let authenticationModuleUrl = "";
      let userStoreModuleUrl = "";
      page.on("request", (request) => {
        const path = new URL(request.url()).pathname;
        if (path === "/src/services/authentication.ts") authenticationModuleUrl = request.url();
        if (path === "/src/stores/userStore.ts") userStoreModuleUrl = request.url();
      });
      let renewing = false;
      let meRequests = 0;
      let release = () => {};
      const pending = new Promise<void>((resolve) => {
        release = resolve;
      });
      const writes: string[] = [];
      await page.route("**/api/v2/**", async (route) => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        if (request.method() !== "GET") {
          writes.push(`${request.method()} ${path}`);
          await route.abort();
        } else if (path.endsWith("/config")) {
          await route.fulfill({
            json: {
              oidcConfigUrl: `${authority}/.well-known/openid-configuration`,
              oidcClientId: "refapp-test",
              oidcScope: "openid profile email",
              version: "test",
            },
          });
        } else if (path.endsWith("/health-check")) {
          await route.fulfill({ json: { etat: "OK", maintenance: false, version: "test" } });
        } else if (path.endsWith("/users/me")) {
          meRequests += 1;
          if (renewing) await pending;
          await route.fulfill({
            json: {
              id: renewing && changedIdentity ? "other-user" : "test-user",
              email: "user@example.test",
              role: renewing ? "READER" : "ADMIN",
              type: "human",
              permissions: [],
              additionalPermissions: [],
              followedApplications: [],
              emailNotificationsEnabled: false,
              authLevel: { level: "strong", downgraded: false, reason: "strong-method" },
            },
          });
        } else {
          await route.fulfill({ json: path.endsWith("/unread-count") ? { count: 0 } : [] });
        }
      });
      await page.goto("/applications/creer");
      const label = page.getByTestId("application-label");
      const description = page.locator("textarea#application-description");
      await label.fill("Saisie non enregistrée");
      await description.fill("Description conservée pendant le renouvellement.");
      const requestsBeforeRenew = meRequests;
      renewing = true;
      expect(authenticationModuleUrl).not.toBe("");
      expect(userStoreModuleUrl).not.toBe("");
      await page.evaluate(async (moduleUrl) => {
        const { USER_MANAGER }: typeof import("../src/services/authentication") = await import(/* @vite-ignore */ moduleUrl);
        const user = await USER_MANAGER.getUser();
        if (!user) throw new Error("La session de test doit être chargée");
        await USER_MANAGER.events.load(user);
      }, authenticationModuleUrl);
      await expect.poll(() => meRequests).toBeGreaterThan(requestsBeforeRenew);
      await expect(label).toHaveValue("Saisie non enregistrée");
      await expect(description).toBeFocused();
      release();
      await expect
        .poll(() =>
          page.evaluate(async (moduleUrl) => {
            const { useUserStore }: typeof import("../src/stores/userStore") = await import(/* @vite-ignore */ moduleUrl);
            return useUserStore().user?.role;
          }, userStoreModuleUrl),
        )
        .toBe("READER");
      await expect(label).toHaveValue(changedIdentity ? "" : "Saisie non enregistrée");
      await expect(description).toHaveValue(changedIdentity ? "" : "Description conservée pendant le renouvellement.");
      if (!changedIdentity) await expect(description).toBeFocused();
      expect(writes).toEqual([]);
    },
  );
}
