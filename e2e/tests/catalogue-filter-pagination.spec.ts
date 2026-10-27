import { type Page, type Response } from "@playwright/test";
import { correlationQaFixture } from "../../backend/prisma/qa-correlation-fixtures";
import { ApiClient, type Paginated } from "../fixtures/api-client";
import { expect, test } from "../fixtures/test";
import { SearchPage } from "../pom";

const statuses = [
  "under_construction",
  "to_validate",
  "poc",
  "in_production_mvp",
  "in_production",
  "in_production_decommissioning",
  "decommissioned",
];

function query(filters: Record<string, string> = {}) {
  return new URLSearchParams({
    currentStatus__in: statuses.join(","),
    currentStatus__isNull: "true",
    pageSize: "1",
    page: "0",
    sortBy: "label",
    order: "asc",
    ...filters,
  });
}

function catalogueResponse(
  page: Page,
  matches: (params: URLSearchParams) => boolean,
) {
  return page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      response.request().method() === "GET" &&
      url.pathname === "/api/v2/applications" &&
      url.searchParams.get("pageSize") === "1" &&
      url.searchParams.has("page") &&
      matches(url.searchParams)
    );
  });
}

async function expectResults(
  page: Page,
  search: SearchPage,
  response: Response,
) {
  expect([200, 304]).toContain(response.status());
  // Firefox expose la revalidation 304 sans corps ; relire exactement la même requête
  // avec le client authentifié conserve une assertion sur de vraies données du backend.
  const body =
    response.status() === 304
      ? await (
          await ApiClient.fromPage(page)
        ).applications(new URL(response.url()).searchParams.toString())
      : ((await response.json()) as Paginated<{ id: string; label: string }>);
  expect(body).not.toBeNull();
  if (!body) throw new Error("La réponse du catalogue est absente");
  expect(body.results).toHaveLength(1);
  await expect.poll(() => search.firstRowLabel()).toBe(body.results[0].label);
  await expect.poll(() => search.totalCount()).toBe(body.total);
  return body;
}

async function openLastPage(
  page: Page,
  search: SearchPage,
  api: ApiClient,
  filters: Record<string, string> = {},
) {
  const params = query(filters);
  const first = await api.applications(params.toString());
  expect(first, "Les lectures du catalogue doivent réussir").not.toBeNull();
  expect(
    first!.total,
    "Les fixtures QA doivent fournir plusieurs pages",
  ).toBeGreaterThan(1);
  params.set("page", String(first!.total - 1));
  const response = catalogueResponse(
    page,
    (p) => p.get("page") === params.get("page"),
  );
  await search.open(params);
  await expectResults(page, search, await response);
  return first!.total;
}

async function expectReset(page: Page, search: SearchPage, response: Response) {
  expect(new URL(response.url()).searchParams.get("page")).toBe("0");
  await expect
    .poll(() => Number(new URL(page.url()).searchParams.get("page") ?? 0))
    .toBe(0);
  return expectResults(page, search, response);
}

// Vrais appels API et fixtures QA : une page de taille 1 suffit à reproduire une page
// devenue vide après réduction du catalogue. Seul le scénario statut crée une application
// jetable, car un seed peut donner le même statut à toutes les applications ; nettoyage final.
test.describe("Catalogue — retour à la première page après filtrage (#2949)", () => {
  test("changer un statut depuis la dernière page affiche le premier résultat filtré", async ({
    page,
    data,
  }, testInfo) => {
    void data;
    const search = new SearchPage(page);
    const api = await ApiClient.fromPage(page);
    const label = `E2E-FILTER-PAGINATION-${testInfo.project.name}-${Date.now()}`;
    const fixture = await api.createApplication({
      label,
      shortName: label,
      description: "Fixture temporaire de non-régression pagination/statut",
      tags: [],
      status: { status: "in_production", statusDate: new Date().toISOString() },
    });
    expect(fixture).not.toBeNull();
    try {
      const total = await openLastPage(page, search, api);
      const response = catalogueResponse(
        page,
        (p) =>
          !(p.get("currentStatus__in") ?? "")
            .split(",")
            .includes("under_construction"),
      );
      await search.removeStatus("under_construction");
      const filtered = await expectReset(page, search, await response);
      expect(filtered.total).toBeLessThan(total);
    } finally {
      expect(await api.deleteApplication(fixture!.id)).toBe(true);
    }
  });

  test("Sans statut réinitialise la page en conservant les statuts sélectionnés", async ({
    page,
    data,
  }) => {
    void data;
    const search = new SearchPage(page);
    await openLastPage(page, search, await ApiClient.fromPage(page));
    const response = catalogueResponse(
      page,
      (p) => p.get("currentStatus__isNull") === "false",
    );
    await search.toggleWithoutStatus();
    const result = await response;
    expect(new URL(result.url()).searchParams.get("currentStatus__in")).toBe(
      statuses.join(","),
    );
    await expectReset(page, search, result);
  });

  test("Inclure, Exclure et Neutre repartent de la première page", async ({
    page,
    data,
  }, testInfo) => {
    void data;
    const search = new SearchPage(page);
    const api = await ApiClient.fromPage(page);
    const fixture = correlationQaFixture(testInfo.project.name, "accepted");
    for (const mode of ["INCLUDE", "EXCLUDE", "NEUTRAL"] as const) {
      const total = await openLastPage(page, search, api, {
        relationAppId: fixture.source.id,
        is_correlated_with: mode === "NEUTRAL" ? "EXCLUDE" : "NEUTRAL",
      });
      const response = catalogueResponse(
        page,
        (p) => p.get("is_correlated_with") === mode,
      );
      await search.setRelationMode("is_correlated_with", mode);
      const filtered = await expectReset(page, search, await response);
      if (mode !== "NEUTRAL") expect(filtered.total).toBeLessThan(total);
    }
  });

  test("choisir, remplacer et retirer la référence réinitialise la page", async ({
    page,
    data,
  }, testInfo) => {
    void data;
    const search = new SearchPage(page);
    const api = await ApiClient.fromPage(page);
    const fixture = correlationQaFixture(testInfo.project.name, "accepted");
    const total = await openLastPage(page, search, api, {
      is_correlated_with: "INCLUDE",
    });
    let response = catalogueResponse(
      page,
      (p) => p.get("relationAppId") === fixture.source.id,
    );
    await search.selectRelationTarget(fixture.source.label, fixture.source.id);
    const filtered = await expectReset(page, search, await response);
    expect(filtered.total).toBeLessThan(total);
    expect(filtered.results[0].id).toBe(fixture.target.id);

    await openLastPage(page, search, api, {
      relationAppId: fixture.source.id,
      is_correlated_with: "EXCLUDE",
    });
    response = catalogueResponse(
      page,
      (p) => p.get("relationAppId") === fixture.target.id,
    );
    await search.selectRelationTarget(fixture.target.label, fixture.target.id);
    await expectReset(page, search, await response);

    await openLastPage(page, search, api, {
      relationAppId: fixture.target.id,
      is_correlated_with: "EXCLUDE",
    });
    response = catalogueResponse(page, (p) => !p.has("relationAppId"));
    await search.clearRelationTarget(fixture.target.label);
    await expectReset(page, search, await response);
  });

  test("la pagination seule conserve la page choisie et le résultat correspondant", async ({
    page,
    data,
  }) => {
    void data;
    const search = new SearchPage(page);
    const initial = catalogueResponse(page, (p) => p.get("page") === "0");
    await search.open(query());
    const first = await expectResults(page, search, await initial);
    const response = catalogueResponse(page, (p) => p.get("page") === "1");
    await search.goToNextPage();
    const second = await expectResults(page, search, await response);
    expect(new URL(page.url()).searchParams.get("page")).toBe("1");
    expect(second.results[0].id).not.toBe(first.results[0].id);
  });
});
