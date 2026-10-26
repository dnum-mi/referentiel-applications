import type { Route } from "@playwright/test";
import type { AppRef, DataFeature } from "../fixtures/datafeature";
import { test, expect } from "../fixtures/test";
import { RelationNavigationPage } from "../pom/relation-navigation.page";

function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => (release = resolve));
  return { promise, release };
}

async function applications(data: DataFeature) {
  const a = await data.applicationByLabel("QA-SCOPE-TOTO");
  const b = await data.applicationByLabel("QA-SCOPE-ABCD");
  if (!a || !b) throw new Error("Applications de qualification QA absentes.");
  return { a, b };
}

function relation(source: AppRef, target: AppRef, label: string) {
  return {
    id: `${source.id}-${label}`,
    applicationSourceId: source.id,
    applicationTargetId: target.id,
    mediationServiceId: null,
    type: "is_part_of",
    sourceApplication: source,
    targetApplication: { ...target, label },
    mediationService: null,
  };
}

function respond(route: Route, source: AppRef, target: AppRef, label: string) {
  // La donnée métier et l'identité restent réelles ; seule cette liste de consultation
  // est contrôlée pour reproduire un ordre réseau déterministe, sans mutation en base.
  return route.fulfill({ json: [relation(source, target, label)] });
}

test.describe("Relations — isolation pendant la navigation (#2951)", () => {
  test("REL-NAV-01 - une réponse de A terminée après B ne remplace pas les lignes de B", async ({
    page,
    data,
  }) => {
    const { a, b } = await applications(data);
    const ready = gate();
    const release = gate();
    const completed = gate();
    const fiche = new RelationNavigationPage(page);
    await page.route(
      `**/api/v2/applications/${a.id}/relations`,
      async (route) => {
        ready.release();
        await release.promise;
        await respond(route, a, b, "E2E RELATION ANCIENNE A");
        completed.release();
      },
    );
    await page.route(`**/api/v2/applications/${b.id}/relations`, (route) =>
      respond(route, b, a, "E2E RELATION B"),
    );
    try {
      await fiche.open(a);
      await ready.promise;
      await fiche.navigate(b);
      await fiche.expectOnlyRelation("E2E RELATION B");
      const response = page.waitForResponse(
        (res) =>
          new URL(res.url()).pathname ===
          `/api/v2/applications/${a.id}/relations`,
      );
      release.release();
      const lateResponse = await response;
      expect(lateResponse.ok()).toBe(true);
      await lateResponse.finished();
      await completed.promise;
      await fiche.settleRendering();
      await fiche.expectOnlyRelation("E2E RELATION B");
      await fiche.expectRelationAbsent("E2E RELATION ANCIENNE A");
    } finally {
      release.release();
    }
  });

  test("REL-NAV-02 - un retour A vers B vers A ignore la première réponse de A", async ({
    page,
    data,
  }) => {
    const { a, b } = await applications(data);
    const ready = gate();
    const release = gate();
    const completed = gate();
    let requestsForA = 0;
    const fiche = new RelationNavigationPage(page);
    await page.route(
      `**/api/v2/applications/${a.id}/relations`,
      async (route) => {
        requestsForA += 1;
        if (requestsForA === 1) {
          ready.release();
          await release.promise;
          await respond(route, a, b, "E2E RELATION ANCIENNE A");
          completed.release();
        } else {
          await respond(route, a, b, "E2E RELATION ACTUELLE A");
        }
      },
    );
    await page.route(`**/api/v2/applications/${b.id}/relations`, (route) =>
      respond(route, b, a, "E2E RELATION B"),
    );
    try {
      await fiche.open(a);
      await ready.promise;
      await fiche.navigate(b);
      await fiche.expectOnlyRelation("E2E RELATION B");
      await fiche.navigate(a);
      await fiche.expectOnlyRelation("E2E RELATION ACTUELLE A");
      const response = page.waitForResponse(
        (res) =>
          new URL(res.url()).pathname ===
          `/api/v2/applications/${a.id}/relations`,
      );
      release.release();
      const lateResponse = await response;
      expect(lateResponse.ok()).toBe(true);
      await lateResponse.finished();
      await completed.promise;
      await fiche.settleRendering();
      await fiche.expectOnlyRelation("E2E RELATION ACTUELLE A");
      await fiche.expectRelationAbsent("E2E RELATION ANCIENNE A");
      await fiche.expectRelationAbsent("E2E RELATION B");
    } finally {
      release.release();
    }
  });

  test("REL-NAV-03 - un chargement B refusé ne garde aucune ligne ni action de A", async ({
    page,
    data,
  }) => {
    const { a, b } = await applications(data);
    const fiche = new RelationNavigationPage(page);
    await page.route(`**/api/v2/applications/${a.id}/relations`, (route) =>
      respond(route, a, b, "E2E RELATION A"),
    );
    await page.route(`**/api/v2/applications/${b.id}/relations`, (route) =>
      route.fulfill({
        status: 403,
        json: { message: "Refus simulé de qualification des relations" },
      }),
    );
    await fiche.open(a);
    await fiche.expectOnlyRelation("E2E RELATION A");
    await fiche.navigate(b);
    await fiche.expectEmptyWithoutActions();
    await fiche.expectToaster(/Erreur lors du chargement des relations/i);
  });
});
