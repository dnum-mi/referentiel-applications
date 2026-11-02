import type { INestApplication } from "@nestjs/common";
import { Roles } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { ApplicationSearchService } from "src/applications/search/application-search.service";
import request from "supertest";
import { getPrismaClient } from "./fakers/prisma";
import { getToken } from "./getToken";
import { setupApp } from "./setup";

interface Evaluation {
  millesime: number;
  technicalMaturity: number | null;
  businessMaturity: number | null;
  costContainment: number | null;
}

interface SearchItem {
  id: string;
  technicalDebtInfo: Evaluation | null;
}

interface SearchResult {
  results: SearchItem[];
  total: number;
  technicalDebtPoints: SearchItem[];
}

describe("Recherche TIME — cohérence du millésime affiché (#2971)", () => {
  const prisma = getPrismaClient();
  const fixtureToken = `timemillesime${randomUUID().replaceAll("-", "")}`;
  const ids = {
    first: randomUUID(),
    second: randomUUID(),
    incomplete: randomUUID(),
    currentOnly: randomUUID(),
  };
  const selectedIds = [ids.first, ids.second, ids.incomplete].sort();
  const selectedScores = new Map<string, number | null>([
    [ids.first, 1],
    [ids.second, 2],
    [ids.incomplete, null],
  ]);
  let app: INestApplication;
  let searchService: ApplicationSearchService;
  let token: string;
  let userId: string;

  const search = async (
    query: Record<string, string | number> = {},
  ): Promise<SearchResult> => {
    const response = await request(app.getHttpServer())
      .get("/applications")
      .query({ label: fixtureToken, pageSize: 0, ...query })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    return response.body as SearchResult;
  };

  function expectSelectedEvaluation(item: SearchItem) {
    expect(selectedScores.has(item.id)).toBe(true);
    const score = selectedScores.get(item.id);
    expect(item.technicalDebtInfo).toMatchObject({
      millesime: 2025,
      technicalMaturity: score,
      businessMaturity: score,
      costContainment: score,
    });
  }

  beforeAll(async () => {
    app = await setupApp();
    searchService = app.get(ApplicationSearchService);
    const user = await prisma.user.create({
      data: {
        email: `${fixtureToken}@example.test`,
        role: Roles.READER,
        additionalPermissions: [],
      },
    });
    userId = user.id;
    token = getToken(user);

    const fixtures = [
      { id: ids.first, previous: 1, current: 5 },
      { id: ids.second, previous: 2, current: 4 },
      { id: ids.incomplete, previous: null, current: 3 },
      { id: ids.currentOnly, previous: undefined, current: 2 },
    ];
    for (const fixture of fixtures) {
      await prisma.application.create({
        data: {
          id: fixture.id,
          label: `${fixtureToken} ${fixture.id}`,
          shortName: `${fixtureToken}-${fixture.id}`,
          description: "Application de test des évaluations TIME annuelles",
          quality: 80,
          technicalDebtInfo: {
            create: [
              ...(fixture.previous !== undefined
                ? [
                    {
                      millesime: 2025,
                      technicalMaturity: fixture.previous,
                      businessMaturity: fixture.previous,
                      costContainment: fixture.previous,
                      createdAt: new Date("2025-10-01T10:00:00Z"),
                    },
                  ]
                : []),
              {
                millesime: 2026,
                technicalMaturity: fixture.current,
                businessMaturity: fixture.current,
                costContainment: fixture.current,
                createdAt: new Date("2026-10-01T10:00:00Z"),
              },
            ],
          },
        },
      });
    }
    await searchService.refreshIndex();
  });

  afterAll(async () => {
    try {
      await prisma.application.deleteMany({
        where: { id: { in: Object.values(ids) } },
      });
      if (searchService) await searchService.refreshIndex();
      if (userId) {
        await prisma.userConnexionLog.deleteMany({ where: { userId } });
        await prisma.user.delete({ where: { id: userId } });
      }
    } finally {
      if (app) await app.close();
      await prisma.$disconnect();
    }
  });

  it.each([
    { name: "classique", query: { sortBy: "shortName" } },
    { name: "q", query: { q: fixtureToken } },
    { name: "qPrefix", query: { qPrefix: fixtureToken.slice(0, -3) } },
  ])(
    "affiche les scores 2025 et les seuls points complets de 2025 en recherche $name",
    async ({ query }) => {
      const result = await search({ ...query, millesime: 2025 });

      expect(result.total).toBe(3);
      expect(result.results.map(({ id }) => id).sort()).toEqual(selectedIds);
      result.results.forEach(expectSelectedEvaluation);
      expect(result.technicalDebtPoints.map(({ id }) => id).sort()).toEqual(
        [ids.first, ids.second].sort(),
      );
      result.technicalDebtPoints.forEach(expectSelectedEvaluation);
    },
  );

  it.each([
    { sortBy: "technicalMaturity", order: "asc" },
    { sortBy: "technicalMaturity", order: "desc" },
    { sortBy: "businessMaturity", order: "asc" },
    { sortBy: "businessMaturity", order: "desc" },
    { sortBy: "costContainment", order: "asc" },
    { sortBy: "costContainment", order: "desc" },
  ])(
    "trie les notes 2025 par $sortBy $order avant pagination",
    async ({ sortBy, order }) => {
      const orderedIds = [
        ...(order === "asc"
          ? [ids.first, ids.second]
          : [ids.second, ids.first]),
        ids.incomplete,
      ];
      const receivedIds: string[] = [];
      const receivedPointIds: string[] = [];
      for (let page = 0; page < 3; page++) {
        const result = await search({
          millesime: 2025,
          sortBy,
          order,
          pageSize: 1,
          page,
        });
        expect(result.total).toBe(3);
        expect(result.results).toHaveLength(1);
        expect(result.results.map(({ id }) => id)).toEqual([orderedIds[page]]);
        result.results.forEach(expectSelectedEvaluation);
        result.technicalDebtPoints.forEach(expectSelectedEvaluation);
        receivedIds.push(...result.results.map(({ id }) => id));
        receivedPointIds.push(
          ...result.technicalDebtPoints.map(({ id }) => id),
        );
      }
      expect(receivedIds.sort()).toEqual(selectedIds);
      expect(receivedPointIds.sort()).toEqual([ids.first, ids.second].sort());

      const pastLastPage = await search({
        millesime: 2025,
        sortBy,
        order,
        pageSize: 1,
        page: 3,
      });
      expect(pastLastPage).toMatchObject({
        results: [],
        total: 3,
        technicalDebtPoints: [],
      });
    },
  );

  it("ne reprend pas une autre campagne lorsque le millésime demandé est absent", async () => {
    const result = await search({ millesime: 2024 });
    expect(result).toMatchObject({
      results: [],
      total: 0,
      technicalDebtPoints: [],
    });
  });

  it("conserve la dernière évaluation de chaque application sans filtre de millésime", async () => {
    const result = await search();
    expect(result.total).toBe(4);
    expect(result.results.map(({ id }) => id).sort()).toEqual(
      Object.values(ids).sort(),
    );
    expect(result.technicalDebtPoints).toHaveLength(4);
    expect(
      result.results.find(({ id }) => id === ids.first)?.technicalDebtInfo,
    ).toMatchObject({
      millesime: 2026,
      technicalMaturity: 5,
      businessMaturity: 5,
      costContainment: 5,
    });
    for (const item of [...result.results, ...result.technicalDebtPoints]) {
      expect(item.technicalDebtInfo?.millesime).toBe(2026);
    }
  });
});
