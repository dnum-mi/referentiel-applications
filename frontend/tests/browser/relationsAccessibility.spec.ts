import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import type { RelationGraphDto } from "../../src/client";

const network: RelationGraphDto = {
  rootId: "root",
  nodes: [
    { id: "root", label: "Application de démonstration", status: "in_production" },
    { id: "a", label: "Alpha" },
    { id: "b", label: "Beta" },
    { id: "c", label: "Gamma" },
  ],
  edges: [
    { id: "1", sourceId: "root", sourceLabel: "Application de démonstration", targetId: "a", targetLabel: "Alpha", type: "is_part_of" },
    {
      id: "2",
      sourceId: "root",
      sourceLabel: "Application de démonstration",
      targetId: "b",
      targetLabel: "Beta",
      type: "is_service_user_of",
    },
    { id: "3", sourceId: "b", sourceLabel: "Beta", targetId: "c", targetLabel: "Gamma", type: "is_correlated_with" },
  ],
};

async function openRelations(page: Page, { empty = false, readOnly = false } = {}) {
  await page.route("**/api/v2/config", (route) =>
    route.fulfill({
      json: {
        oidcConfigUrl: "http://localhost/oidc/.well-known/openid-configuration",
        oidcClientId: "browser-test",
        footerLinks: [],
        betaFeatures: [],
      },
    }),
  );
  await page.route("**/api/v2/applications/root/relations", (route) =>
    route.fulfill({
      json: empty
        ? []
        : [
            {
              id: "1",
              applicationSourceId: "root",
              applicationTargetId: "a",
              sourceApplication: { id: "root", label: "Application de démonstration" },
              targetApplication: { id: "a", label: "Alpha" },
              type: "is_part_of",
            },
          ],
    }),
  );
  await page.route("**/api/v2/applications/root/relations/graph?*", (route) => {
    const depth = Number(new URL(route.request().url()).searchParams.get("depth"));
    return route.fulfill({
      json: empty
        ? { ...network, nodes: network.nodes.slice(0, 1), edges: [] }
        : depth === 1
          ? { ...network, nodes: network.nodes.slice(0, 3), edges: network.edges.slice(0, 2) }
          : network,
    });
  });
  await page.goto(`/tests/browser/fixtures/relations.html${readOnly ? "?readOnly" : ""}`);
  await expect(page.getByRole("img", { name: /Relations de Application de démonstration/ })).toBeVisible();
}

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  for (const empty of [false, true]) {
    test(`graphe prioritaire à ${viewport.width}px, réseau ${empty ? "sans relation" : "avec relations"}`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      await openRelations(page, { empty });
      await expect(page.getByRole("button", { name: "Graphe", exact: true })).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByRole("button", { name: "Liste", exact: true })).toHaveAttribute("aria-pressed", "false");
      for (const label of ["Graphe", "Liste"]) {
        await expect(page.getByRole("button", { name: label, exact: true }).locator("span")).toBeInViewport();
      }
      const graphButton = (await page.getByRole("button", { name: "Graphe", exact: true }).boundingBox())!;
      const listButton = (await page.getByRole("button", { name: "Liste", exact: true }).boundingBox())!;
      expect(listButton.y).toBe(graphButton.y);
      const graph = page.getByRole("region", { name: "Graphe des relations, zone défilante" });
      const graphBox = (await graph.boundingBox())!;
      const filters = (await page.getByRole("spinbutton", { name: "Saisir la profondeur du réseau" }).boundingBox())!;
      const title = (await page.getByRole("heading", { name: "Réseau de relations", exact: true }).boundingBox())!;
      expect(graphBox.y - title.y - title.height).toBeLessThan(130);
      expect(graphBox.y).toBeLessThan(viewport.height);
      if (viewport.width < 992) expect(filters.y).toBeGreaterThan(graphBox.y + graphBox.height);
      else expect(filters.x).toBeGreaterThan(graphBox.x + graphBox.width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const root = (await page.locator('svg a[data-node-id="root"]').boundingBox())!;
      expect(root.x).toBeGreaterThanOrEqual(graphBox.x);
      expect(root.x + root.width).toBeLessThanOrEqual(graphBox.x + graphBox.width);
      await expect(page.locator("details.navigation-help")).not.toHaveAttribute("open", "");
      await expect(graph).toHaveAccessibleDescription(/Réseau des applications liées/);
      if (!empty) await page.screenshot({ path: testInfo.outputPath("relations.png"), fullPage: true });
      await page.getByRole("link", { name: "Consulter la liste complète du graphe" }).click();
      await expect(page.getByTestId("relations-graph-transcription")).toBeFocused();
      await expect(page.getByTestId("relations-graph-transcription")).toContainText(empty ? "Aucune relation à afficher" : "Alpha");
      // Le SVG existant associe role="img" et liens interactifs ; contrôler ici le HTML réorganisé.
      const axe = await new AxeBuilder({ page }).include("main").exclude(".graph-container > svg").analyze();
      expect(axe.violations).toEqual([]);
    });
  }
}

test("conserve profondeur et filtres lors de l’aller-retour Graphe / Liste", async ({ page }) => {
  await openRelations(page);
  await page.getByRole("spinbutton").fill("2");
  await page.getByRole("spinbutton").press("Tab");
  await expect(page.getByTestId("relations-graph-status")).toContainText("4 applications et 3 relations");
  const filter = page.getByRole("checkbox", { name: /fait partie de/ });
  await filter.focus();
  await filter.press("Space");
  await expect(page.getByTestId("relations-graph-status")).toContainText("3 applications et 2 relations");
  for (const mode of ["Liste", "Graphe"]) {
    await page.getByRole("button", { name: mode, exact: true }).click();
    await expect(page.getByRole("spinbutton")).toHaveValue("2");
    await expect(filter).not.toBeChecked();
    await expect(page.getByTestId("relations-graph-transcription").locator("tbody tr")).toHaveCount(2);
  }
  await expect(page.locator("svg a[data-node-id]")).toHaveCount(3);
});

test("ouvre l’aide au clavier et permet de déplacer la vue et les nœuds", async ({ page }) => {
  await openRelations(page);
  const summary = page.locator("summary", { hasText: "Aide à la navigation" });
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("details.navigation-help")).toHaveAttribute("open", "");
  const image = page.getByRole("img", { name: /Relations de Application/ });
  const viewport = image.locator(":scope > g");
  await page.getByRole("button", { name: "Zoomer", exact: true }).click();
  await expect(viewport).toHaveAttribute("transform", /scale\(1.25\)/);
  const oldTransform = await viewport.getAttribute("transform");
  const pan = page.getByRole("button", { name: "Déplacer la vue à gauche" });
  await pan.focus();
  await pan.press("Enter");
  await expect(viewport).not.toHaveAttribute("transform", oldTransform!);
  await expect(pan).toBeFocused();
  const node = page.locator('svg a[data-node-id="root"]');
  const oldPosition = await node.getAttribute("transform");
  await page.getByRole("button", { name: "Déplacer le nœud à droite" }).click();
  await expect(node).not.toHaveAttribute("transform", oldPosition!);
});

test("garde la racine visible dans un graphe de hauteur réduite en paysage", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await openRelations(page, { empty: true });
  const graph = (await page.getByRole("region", { name: "Graphe des relations, zone défilante" }).boundingBox())!;
  const root = (await page.locator('svg a[data-node-id="root"]').boundingBox())!;
  expect(root.y).toBeGreaterThanOrEqual(graph.y);
  expect(root.y + root.height).toBeLessThanOrEqual(graph.y + graph.height);
});

test("donne un accès direct à la gestion et respecte les permissions", async ({ page }) => {
  await openRelations(page);
  await expect(page.getByRole("button", { name: "Ajouter une relation" })).toBeEnabled();
  await page.getByRole("button", { name: "Gérer les relations directes", exact: true }).click();
  await expect(page.locator('details[id^="relations-management-"]')).toBeFocused();
  await expect(page.getByTestId("relations-table")).toBeVisible();
  await expect(page.getByTestId("relation-edit-btn")).toBeEnabled();
  await page.getByTestId("relation-edit-btn").click();
  await expect(page.getByTestId("relation-edit-modal")).toBeVisible();

  await openRelations(page, { readOnly: true });
  await expect(page.getByRole("button", { name: "Ajouter une relation" })).toBeDisabled();
  await page.getByRole("button", { name: "Liste", exact: true }).click();
  await expect(page.getByTestId("relation-edit-btn")).toBeDisabled();
  await expect(page.getByTestId("relation-delete-selected-btn")).toBeDisabled();
});
