import { expect, test, type Page } from "@playwright/test";

// Le serveur et les schémas réels sont vérifiés par les tests d'intégration backend.
// Ce parcours exerce l'interface complète et le vrai transport multipart du navigateur.
async function prepareSbomSession(page: Page, canWrite: boolean) {
  const authority = "https://sso.example.test";
  await page.addInitScript(
    ({ authority }) => {
      sessionStorage.setItem(
        `oidc.user:${authority}:refapp-test`,
        JSON.stringify({
          access_token: "sbom-ui-session",
          token_type: "Bearer",
          scope: "openid profile email",
          profile: { sub: "sbom-user" },
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        }),
      );
    },
    { authority },
  );
  const state = { committed: false, active: true, commits: 0, deactivations: 0, analysisRequests: 0 };
  const permissions = ["AppRead", "AppList", "TechnologyRead", ...(canWrite ? ["TechnologyWrite"] : [])];
  const component = {
    id: "component-1",
    ref: "vue@3.5.0",
    technology: "Bibliothèque",
    product: "vue",
    version: "3.5.0",
    purl: "pkg:npm/vue@3.5.0",
    ecosystem: "npm",
    type: "library",
    identificationStatus: "identified",
    context: "inventory",
    sourceName: "frontend-production",
    importId: "import-1",
  };
  const preview = {
    id: "import-1",
    sourceName: "frontend-production",
    baseRevision: 0,
    expiresAt: "2099-11-10T12:00:00Z",
    createdAt: "2026-11-09T08:00:00Z",
    status: "committed",
    format: "CycloneDX",
    specVersion: "1.6",
    warnings: ["Les informations VEX ne sont pas exploitées."],
    totalComponents: 1,
    unchanged: false,
    counts: { added: 1, removed: 0, changed: 0, unchanged: 0 },
    changes: {
      added: [{ ref: component.ref, product: component.product, version: component.version }],
      removed: [],
      changed: [],
      unchanged: 0,
    },
  };
  await page.route("**/api/v2/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith("/config"))
      return route.fulfill({
        json: {
          oidcConfigUrl: `${authority}/.well-known/openid-configuration`,
          oidcClientId: "refapp-test",
          oidcScope: "openid profile email",
          version: "test",
        },
      });
    if (path.endsWith("/health-check")) return route.fulfill({ json: { etat: "OK", maintenance: false, version: "test" } });
    if (path.endsWith("/users/me"))
      return route.fulfill({
        json: {
          id: "sbom-user",
          email: "sbom@example.test",
          role: "CONTRIBUTOR",
          type: "human",
          permissions,
          additionalPermissions: [],
          followedApplications: [],
          isBlocked: false,
        },
      });
    if (path.endsWith("/applications/sbom-app"))
      return route.fulfill({
        json: {
          id: "sbom-app",
          label: "Application SBOM",
          description: "Application de test",
          tags: [],
          purposes: [],
          targetPopulations: [],
          businessDivisions: [],
          currentStatus: { status: "in_production" },
        },
      });
    if (path.endsWith("/my-perms")) return route.fulfill({ json: permissions });
    if (path.endsWith("/contact-admin")) return route.fulfill({ json: { email: "admin@example.test" } });
    if (path.endsWith("/sbom-imports/preview")) {
      expect(request.method()).toBe("POST");
      expect(request.headers()["content-type"]).toContain("multipart/form-data; boundary=");
      expect(request.postDataBuffer()?.toString()).toContain('name="sourceName"');
      expect(request.postDataBuffer()?.toString()).toContain("frontend-production");
      state.analysisRequests++;
      return route.fulfill({ json: preview });
    }
    if (path.endsWith("/sbom-imports/import-1/commit")) {
      state.committed = true;
      state.active = true;
      state.commits++;
      return route.fulfill({ json: { id: "import-1", sourceId: "source-1", revision: 1, unchanged: false } });
    }
    if (path.endsWith("/sbom-sources/source-1")) {
      const body = request.postDataJSON() as { preview?: boolean; revision: number; active: boolean };
      expect(body.revision).toBe(1);
      expect(body.active).toBe(false);
      if (body.preview) return route.fulfill({ json: { removed: 1, revision: 1 } });
      state.active = false;
      state.deactivations++;
      return route.fulfill({ json: { id: "source-1", revision: 2 } });
    }
    if (path.endsWith("/sbom-sources"))
      return route.fulfill({
        json: state.committed
          ? [
              {
                id: "source-1",
                name: "frontend-production",
                context: null,
                active: state.active,
                revision: state.active ? 1 : 2,
                currentImportId: "import-1",
                componentCount: state.active ? 1 : 0,
                importCount: 1,
                updatedAt: "2026-11-09T08:00:00Z",
                imports: [
                  {
                    id: "import-1",
                    createdAt: "2026-11-09T08:00:00Z",
                    format: "CycloneDX",
                    specVersion: "1.6",
                    componentCount: 1,
                    status: "committed",
                  },
                ],
              },
            ]
          : [],
      });
    if (path.endsWith("/sbom-imports/import-1")) return route.fulfill({ json: { ...preview, components: [component], relations: [] } });
    if (path.endsWith("/software-components"))
      return route.fulfill({
        json: { results: state.committed && state.active ? [component] : [], total: state.committed && state.active ? 1 : 0 },
      });
    if (path.endsWith("/technologies"))
      return route.fulfill({
        json: [
          {
            id: "manual-1",
            applicationId: "sbom-app",
            technology: "Base de données",
            product: "PostgreSQL manuel",
            version: "16",
            eolSource: "manual",
            eolDate: "2030-01-01T00:00:00Z",
            eolCheckedAt: null,
            eolStatus: null,
          },
        ],
      });
    return route.fulfill({ json: path.endsWith("/unread-count") ? { count: 0 } : [] });
  });
  return state;
}

test("importer, annuler, confirmer puis désactiver un SBOM conserve les technologies manuelles", async ({ page }) => {
  const state = await prepareSbomSession(page, true);
  await page.goto("/applications/sbom-app/tab-technologies");
  const inventory = page.getByTestId("sbom-inventory");
  await expect(inventory).toBeVisible();
  await expect(page.getByText("PostgreSQL manuel", { exact: true })).toBeVisible();
  async function analyze() {
    await inventory.getByRole("button", { name: "Importer un SBOM", exact: true }).click();
    await inventory.getByLabel("Nom de la nouvelle source", { exact: false }).fill("frontend-production");
    await inventory.getByLabel("Fichier SBOM JSON", { exact: false }).setInputFiles({
      name: "inventory.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"bomFormat":"CycloneDX","specVersion":"1.6","version":1}'),
    });
    await inventory.getByRole("button", { name: "Analyser le fichier" }).click();
    await expect(inventory.getByRole("heading", { name: "Prévisualisation de la source frontend-production" })).toBeFocused();
    await expect(inventory.getByRole("cell", { name: "3.5.0", exact: true })).toBeVisible();
  }
  await analyze();
  await inventory.getByRole("button", { name: "Annuler l’import" }).click();
  expect(state.commits).toBe(0);
  await expect(inventory.getByRole("button", { name: "Importer un SBOM", exact: true })).toBeFocused();
  await analyze();
  await inventory.getByRole("button", { name: "Confirmer l’import" }).click();
  await expect(inventory.getByText("SBOM · frontend-production")).toBeVisible();
  expect(state.commits).toBe(1);
  await inventory.getByText("Historique de frontend-production (1)").click();
  await inventory.getByRole("button", { name: /Consulter l’import/ }).click();
  await expect(inventory.getByText("Aucune relation déclarée dans cet import.", { exact: false })).toBeVisible();
  await inventory.getByRole("button", { name: "Fermer le détail de l’import" }).click();
  await inventory.getByRole("button", { name: "Prévisualiser la désactivation de frontend-production" }).click();
  expect(state.deactivations).toBe(0);
  await inventory.getByRole("button", { name: "Confirmer la désactivation" }).click();
  await expect(inventory.getByRole("heading", { name: "frontend-production — Inactive" })).toBeVisible();
  await expect(inventory.getByText("Aucun composant à afficher.")).toBeVisible();
  await expect(page.getByText("PostgreSQL manuel", { exact: true })).toBeVisible();
  expect(state.deactivations).toBe(1);
});

test("un lecteur consulte l’inventaire sans commandes d’import ni de désactivation", async ({ page }) => {
  const state = await prepareSbomSession(page, false);
  state.committed = true;
  await page.goto("/applications/sbom-app/tab-technologies");
  const inventory = page.getByTestId("sbom-inventory");
  await expect(inventory.getByText("SBOM · frontend-production")).toBeVisible();
  await expect(inventory.getByRole("button", { name: "Importer un SBOM", exact: true })).toHaveCount(0);
  await expect(inventory.getByRole("button", { name: /désactivation/ })).toHaveCount(0);
  expect(state.analysisRequests).toBe(0);
});
