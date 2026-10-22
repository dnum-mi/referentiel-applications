import type { INestApplication } from "@nestjs/common";
import { Roles } from "@prisma/client";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { getPrismaClient } from "./fakers/prisma";
import { getToken } from "./getToken";
import { setupApp } from "./setup";

interface SearchItem {
  id: string;
  technicalDebtInfo: {
    costContainment: number | null;
    technicalMaturity: number | null;
    businessMaturity: number | null;
  } | null;
}

interface SearchResult {
  results: SearchItem[];
  total: number;
}

describe("Catalogue — tri Maîtrise des coûts MCO (#2945)", () => {
  const prisma = getPrismaClient();
  const prefix = `cost-sort-${randomUUID()}`;
  const tagName = `${prefix}-selected`;
  const ids = {
    low: randomUUID(),
    middle: randomUUID(),
    high: randomUUID(),
    latestNull: randomUUID(),
    noEvaluation: randomUUID(),
    outsideFilter: randomUUID(),
  };
  const nullIds = [ids.latestNull, ids.noEvaluation].sort();
  const previousDate = new Date("2026-01-01T10:00:00Z");
  const latestDate = new Date("2026-01-02T10:00:00Z");
  let app: INestApplication;
  let token: string;
  let userId: string;

  const expectedCostIds = (order: "asc" | "desc") => [
    ...(order === "asc"
      ? [ids.low, ids.middle, ids.high]
      : [ids.high, ids.middle, ids.low]),
    ...nullIds,
  ];

  const search = async ({
    sortBy = "costContainment",
    order = "asc",
    page = 0,
    pageSize = 0,
    tag,
    label = prefix,
  }: {
    sortBy?: string;
    order?: "asc" | "desc";
    page?: number;
    pageSize?: number;
    tag?: string;
    label?: string;
  } = {}): Promise<SearchResult> => {
    const response = await request(app.getHttpServer())
      .get("/applications")
      .query({ label, sortBy, order, page, pageSize, ...(tag ? { tag } : {}) })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    return response.body as SearchResult;
  };

  beforeAll(async () => {
    app = await setupApp();
    const user = await prisma.user.create({
      data: {
        email: `${prefix}@example.test`,
        role: Roles.READER,
        additionalPermissions: [],
      },
    });
    userId = user.id;
    token = getToken(user);
    const tag = await prisma.tag.create({ data: { name: tagName } });

    const fixtures = [
      {
        id: ids.low,
        label: "Faible",
        shortName: "ZZZ",
        cost: 1.25,
        technical: 4,
        business: 2,
        previousCost: 4.75,
        tagged: true,
      },
      {
        id: ids.middle,
        label: "Moyen",
        shortName: "MMM",
        cost: 3.5,
        technical: 2,
        business: 5,
        previousCost: 1.25,
        tagged: false,
      },
      {
        id: ids.high,
        label: "Élevé",
        shortName: "AAA",
        cost: 4.75,
        technical: 3,
        business: 1,
        previousCost: 1.25,
        tagged: true,
      },
      {
        id: ids.latestNull,
        label: "Dernier coût non noté",
        shortName: "BBB",
        cost: null,
        technical: 1,
        business: 3,
        previousCost: 3.5,
        tagged: true,
      },
      {
        id: ids.noEvaluation,
        label: "Sans évaluation",
        shortName: "YYY",
        cost: null,
        technical: null,
        business: null,
        previousCost: null,
        tagged: false,
      },
      {
        id: ids.outsideFilter,
        label: "Sentinelle hors filtre",
        shortName: "CCC",
        cost: 2.5,
        technical: 5,
        business: 4,
        previousCost: null,
        tagged: true,
      },
    ];

    for (const fixture of fixtures) {
      await prisma.application.create({
        data: {
          id: fixture.id,
          label:
            fixture.id === ids.outsideFilter
              ? fixture.label
              : `${prefix} ${fixture.label}`,
          // L'ordre alphabétique contredit volontairement celui des trois scores.
          shortName: fixture.shortName,
          description: "Fixture isolée de tri du catalogue",
          quality: 80,
          ...(fixture.tagged ? { tags: { connect: { id: tag.id } } } : {}),
          ...(fixture.id !== ids.noEvaluation
            ? {
                technicalDebtInfo: {
                  create: [
                    {
                      costContainment: fixture.cost,
                      technicalMaturity: fixture.technical,
                      businessMaturity: fixture.business,
                      createdAt: latestDate,
                    },
                    ...(fixture.previousCost !== null
                      ? [
                          {
                            costContainment: fixture.previousCost,
                            technicalMaturity: 5,
                            businessMaturity: 4,
                            createdAt: previousDate,
                          },
                        ]
                      : []),
                  ],
                },
              }
            : {}),
        },
      });
    }
  });

  afterAll(async () => {
    try {
      await prisma.application.deleteMany({
        where: { id: { in: Object.values(ids) } },
      });
      await prisma.tag.deleteMany({ where: { name: tagName } });
      if (userId) {
        await prisma.userConnexionLog.deleteMany({ where: { userId } });
        await prisma.user.delete({ where: { id: userId } });
      }
    } finally {
      if (app) await app.close();
      await prisma.$disconnect();
    }
  });

  it.each(["asc", "desc"] as const)(
    "ordonne toutes les fiches avant de paginer en %s, avec les NULL en fin",
    async (order) => {
      const pages: SearchItem[][] = [];
      for (let page = 0; page < 3; page++) {
        const result = await search({ order, page, pageSize: 2 });
        expect(result.total).toBe(5);
        expect(result.results).toHaveLength(page < 2 ? 2 : 1);
        pages.push(result.results);
      }
      const orderedIds = pages.flat().map((item) => item.id);
      expect(orderedIds).toEqual(expectedCostIds(order));
      expect(new Set(orderedIds).size).toBe(5);
      expect(orderedIds).not.toContain(ids.outsideFilter);
      const pastLastPage = await search({ order, page: 3, pageSize: 2 });
      expect(pastLastPage.total).toBe(5);
      expect(pastLastPage.results).toEqual([]);
    },
  );

  it.each(["asc", "desc"] as const)(
    "accepte costMaturity comme alias du champ réel en %s",
    async (order) => {
      const result = await search({ sortBy: "costMaturity", order });
      expect(result.total).toBe(5);
      expect(result.results.map((item) => item.id)).toEqual(
        expectedCostIds(order),
      );
    },
  );

  it.each(["asc", "desc"] as const)(
    "conserve le filtre de tag en plus du filtre de libellé en %s",
    async (order) => {
      const result = await search({ order, tag: tagName });
      expect(result.total).toBe(3);
      expect(result.results.map((item) => item.id)).toEqual([
        ...(order === "asc" ? [ids.low, ids.high] : [ids.high, ids.low]),
        ids.latestNull,
      ]);
      expect(result.results.map((item) => item.id)).not.toContain(
        ids.outsideFilter,
      );
    },
  );

  it("affiche la dernière évaluation, y compris son coût nul, sans reprendre un ancien score", async () => {
    const result = await search();
    const byId = new Map(result.results.map((item) => [item.id, item]));
    expect(byId.get(ids.low)?.technicalDebtInfo?.costContainment).toBe(1.25);
    expect(byId.get(ids.middle)?.technicalDebtInfo?.costContainment).toBe(3.5);
    expect(byId.get(ids.high)?.technicalDebtInfo?.costContainment).toBe(4.75);
    expect(
      byId.get(ids.latestNull)?.technicalDebtInfo?.costContainment,
    ).toBeNull();
    expect(byId.get(ids.noEvaluation)?.technicalDebtInfo).toBeNull();
  });

  it.each([
    {
      sortBy: "technicalMaturity",
      order: "asc" as const,
      expected: [
        ids.latestNull,
        ids.middle,
        ids.high,
        ids.low,
        ids.noEvaluation,
      ],
    },
    {
      sortBy: "technicalMaturity",
      order: "desc" as const,
      expected: [
        ids.low,
        ids.high,
        ids.middle,
        ids.latestNull,
        ids.noEvaluation,
      ],
    },
    {
      sortBy: "businessMaturity",
      order: "asc" as const,
      expected: [
        ids.high,
        ids.low,
        ids.latestNull,
        ids.middle,
        ids.noEvaluation,
      ],
    },
    {
      sortBy: "businessMaturity",
      order: "desc" as const,
      expected: [
        ids.middle,
        ids.latestNull,
        ids.low,
        ids.high,
        ids.noEvaluation,
      ],
    },
  ])("préserve le tri $sortBy $order", async ({ sortBy, order, expected }) => {
    const result = await search({ sortBy, order });
    expect(result.total).toBe(5);
    expect(result.results.map((item) => item.id)).toEqual(expected);
  });

  it.each(["asc", "desc"] as const)(
    "préserve le tri classique par nom court en %s",
    async (order) => {
      const result = await search({ sortBy: "shortName", order });
      const alphabeticIds = [
        ids.high,
        ids.latestNull,
        ids.middle,
        ids.noEvaluation,
        ids.low,
      ];
      expect(result.results.map((item) => item.id)).toEqual(
        order === "asc" ? alphabeticIds : alphabeticIds.reverse(),
      );
    },
  );

  it("renvoie un ensemble vide sans SQL de tri invalide quand aucun résultat ne correspond", async () => {
    const result = await search({
      sortBy: "costMaturity",
      label: `${prefix}-absent`,
    });
    expect(result.total).toBe(0);
    expect(result.results).toEqual([]);
  });
});
