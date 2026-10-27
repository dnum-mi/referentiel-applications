import type { Page, Response } from "@playwright/test";
import { ApiClient, type Paginated } from "../fixtures/api-client";
import type { AppRef } from "../fixtures/datafeature";
import { expect, test } from "../fixtures/test";
import { SearchPage } from "../pom";

function catalogueResponse(
  page: Page,
  matches: (query: URLSearchParams) => boolean,
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

async function results(page: Page, response: Response) {
  expect([200, 304]).toContain(response.status());
  // Firefox peut exposer une revalidation 304 sans corps. La même lecture
  // authentifiée conserve des assertions sur les résultats réels du backend.
  const body =
    response.status() === 304
      ? await (
          await ApiClient.fromPage(page)
        ).applications(new URL(response.url()).searchParams.toString())
      : ((await response.json()) as Paginated<AppRef>);
  expect(body).not.toBeNull();
  if (!body) throw new Error("La réponse du catalogue est absente");
  return body;
}

test("Catalogue — le filtre Source de données recherche les données utilisées sans erreur serveur (#2976)", async ({
  page,
  data,
}, testInfo) => {
  const prefix = `E2E-DATASEARCH-${testInfo.project.name}-${Date.now()}`;
  const name = `E2E-InventaireMiXe-${prefix}`;
  const partialName = `inventairemixe-${prefix}`.toLowerCase();
  const createdApps: AppRef[] = [];
  let descriptionId: string | undefined;
  let attachment: { applicationId: string; id: string } | undefined;

  try {
    const consumer = await data.createTestApplication(
      `${prefix} A Consommateur`,
    );
    createdApps.push(consumer);
    const producer = await data.createTestApplication(`${prefix} B Producteur`);
    createdApps.push(producer);
    createdApps.push(
      await data.createTestApplication(`${prefix} C Sans donnée`),
    );
    const description = await data.createDataDescription({
      name,
      applicationSourceIds: [producer.id],
    });
    descriptionId = description.id;
    const usage = await data.attachDataToApplication(
      consumer.id,
      description.id,
    );
    attachment = { applicationId: consumer.id, id: usage.id };

    const search = new SearchPage(page);
    const initialResponse = catalogueResponse(
      page,
      (query) => query.get("label") === prefix && query.get("page") === "2",
    );
    await search.open(
      new URLSearchParams({ label: prefix, page: "2", pageSize: "1" }),
    );
    const initial = await results(page, await initialResponse);
    expect(initial.total).toBe(3);
    expect(initial.results).toHaveLength(1);
    await expect
      .poll(() => search.firstRowLabel())
      .toBe(initial.results[0].label);

    let response = catalogueResponse(
      page,
      (query) => query.get("dataSourceName") === partialName,
    );
    await search.filterByDataSource(partialName);
    const matchResponse = await response;
    expect(new URL(matchResponse.url()).searchParams.get("page")).toBe("0");
    expect(Number(new URL(page.url()).searchParams.get("page") ?? 0)).toBe(0);
    const matched = await results(page, matchResponse);
    expect(matched.total).toBe(1);
    expect(matched.results.map((application) => application.id)).toEqual([
      consumer.id,
    ]);
    await expect.poll(() => search.firstRowLabel()).toBe(consumer.label);
    await expect.poll(() => search.totalCount()).toBe(1);

    const absentName = `${partialName}-absente`;
    response = catalogueResponse(
      page,
      (query) => query.get("dataSourceName") === absentName,
    );
    await search.filterByDataSource(absentName);
    const empty = await results(page, await response);
    expect(empty).toMatchObject({ results: [], total: 0 });
    await search.expectEmptyState();

    response = catalogueResponse(page, (query) => !query.has("dataSourceName"));
    await search.filterByDataSource("");
    const restored = await results(page, await response);
    expect(restored.total).toBe(3);
    await expect.poll(() => search.firstRowLabel()).toBe(consumer.label);
    await expect.poll(() => search.totalCount()).toBe(3);
    expect(new URL(page.url()).searchParams.get("label")).toBe(prefix);

    response = catalogueResponse(
      page,
      (query) => query.get("page") === "1" && !query.has("dataSourceName"),
    );
    await search.goToNextPage();
    const secondPage = await results(page, await response);
    expect(secondPage.total).toBe(3);
    expect(secondPage.results.map((application) => application.id)).toEqual([
      producer.id,
    ]);
    await expect.poll(() => search.firstRowLabel()).toBe(producer.label);
  } finally {
    if (attachment)
      expect(
        await data.detachDataFromApplication(
          attachment.applicationId,
          attachment.id,
        ),
      ).toBe(true);
    if (descriptionId)
      expect(await data.deleteDataDescription(descriptionId)).toBe(true);
    for (const application of createdApps)
      expect(await data.removeApplication(application.id)).toBe(true);
  }
});
