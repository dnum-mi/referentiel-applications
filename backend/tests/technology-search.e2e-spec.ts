import type { INestApplication } from "@nestjs/common";
import { faker } from "@faker-js/faker";
import { Roles } from "@prisma/client";
import { ApplicationSearchService } from "src/applications/search/application-search.service";
import request from "supertest";
import { getPrismaClient } from "./fakers/prisma";
import { getToken } from "./getToken";
import { setupApp } from "./setup";

describe("Applications — recherche par produit et version (#2310)", () => {
  const prisma = getPrismaClient();
  const fixtureToken = `techsearch${faker.string.alpha({ length: 12, casing: "lower" })}`;
  const createdApplicationIds: string[] = [];
  const postgresIds = new Map<string, string>();
  let app: INestApplication;
  let searchService: ApplicationSearchService;
  let token: string;
  let userId: string;
  let postgresWithoutVersionId: string;
  let nginxId: string;
  let nodeJsId: string;
  let accentedProductId: string;
  let labelMatchId: string;
  let budgetId: string;

  const createApplication = async ({
    label = "Fiche",
    product,
    version,
  }: {
    label?: string;
    product?: string;
    version?: string;
  } = {}) => {
    const application = await prisma.application.create({
      data: {
        label: `${fixtureToken} ${label} ${faker.string.alpha({ length: 8 })}`,
        description: "Application de test de la recherche",
        purposes: [],
        targetPopulations: [],
        quality: 100,
        ...(product
          ? {
              technologies: {
                create: { technology: "Composant", product, version },
              },
            }
          : {}),
      },
    });
    createdApplicationIds.push(application.id);
    return application.id;
  };

  const search = async (parameter: "q" | "qPrefix", query: string) => {
    const response = await request(app.getHttpServer())
      .get("/applications")
      .query({ [parameter]: query, label: fixtureToken, pageSize: 0 })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const body = response.body as {
      results: { id: string }[];
      total: number;
    };
    expect(body.total).toBe(body.results.length);
    return body.results.map((application) => application.id);
  };

  beforeAll(async () => {
    app = await setupApp();
    searchService = app.get(ApplicationSearchService);
    const user = await prisma.user.create({
      data: {
        email: `${fixtureToken}@example.com`,
        role: Roles.READER,
        additionalPermissions: [],
      },
    });
    userId = user.id;
    token = getToken(user);

    // Ni les libellés ni les descriptions ne contiennent les produits ou
    // versions recherchés : les correspondances viennent de TechnologyStack.
    for (const version of [
      "15",
      "15.5",
      "15.5.2",
      "15.50",
      "15.6",
      "150",
      "1.5",
    ]) {
      postgresIds.set(
        version,
        await createApplication({ product: "PostgreSQL", version }),
      );
    }
    postgresWithoutVersionId = await createApplication({
      product: "PostgreSQL",
    });
    nginxId = await createApplication({ product: "nginx" });
    nodeJsId = await createApplication({
      product: "Node.js",
      version: "20.11",
    });
    accentedProductId = await createApplication({ product: "Éditeur métier" });
    labelMatchId = await createApplication({ label: "PostgreSQL" });
    budgetId = await createApplication({ label: "Budget 2026" });
    await createApplication();
    await searchService.refreshIndex();
  });

  afterAll(async () => {
    try {
      await prisma.application.deleteMany({
        where: { id: { in: createdApplicationIds } },
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

  describe.each(["q", "qPrefix"] as const)("%s", (parameter) => {
    it("retrouve PostgreSQL par son seul produit, même sans version", async () => {
      const resultIds = await search(parameter, "PostgreSQL");

      expect(resultIds.sort()).toEqual(
        [
          ...postgresIds.values(),
          postgresWithoutVersionId,
          labelMatchId,
        ].sort(),
      );
    });

    it("retrouve nginx sans version et exclut les autres produits", async () => {
      expect(await search(parameter, "nginx")).toEqual([nginxId]);
    });

    it("retrouve un produit dont le nom contient un point", async () => {
      expect(await search(parameter, "Node.js")).toEqual([nodeJsId]);
    });

    it.each([
      {
        query: "PostgreSQL 15",
        expectedVersions: ["15", "15.5", "15.5.2", "15.50", "15.6"],
      },
      { query: "PostgreSQL 15.5", expectedVersions: ["15.5", "15.5.2"] },
      { query: "PostgreSQL 15.5.2", expectedVersions: ["15.5.2"] },
      { query: "15.5", expectedVersions: ["15.5", "15.5.2"] },
    ])(
      "$query respecte les frontières entre segments de version",
      async ({ query, expectedVersions }) => {
        const resultIds = await search(parameter, query);

        expect(resultIds.sort()).toEqual(
          expectedVersions.map((version) => postgresIds.get(version)).sort(),
        );
      },
    );

    it("ignore la casse et les accents du produit", async () => {
      expect(await search(parameter, "EDITEUR METIER")).toEqual([
        accentedProductId,
      ]);
      expect(await search(parameter, "éDiTeUr méTiEr")).toEqual([
        accentedProductId,
      ]);
    });

    it("classe le nom de l'application avant une correspondance de technologie", async () => {
      const resultIds = await search(parameter, "PostgreSQL");

      expect(resultIds[0]).toBe(labelMatchId);
      expect(resultIds).toContain(postgresWithoutVersionId);
    });

    it("actualise les résultats et le cache après modification puis suppression d'une technologie", async () => {
      const applicationId = await createApplication({
        product: "Redis",
        version: "6.2",
      });
      await searchService.refreshIndex();
      expect(await search(parameter, "Redis 6.2")).toEqual([applicationId]);
      // Mémoriser aussi un résultat vide : il doit être invalidé au refresh.
      expect(await search(parameter, "Memcached 7.1")).toEqual([]);

      await prisma.technologyStack.updateMany({
        where: { applicationId },
        data: { product: "Memcached", version: "7.1" },
      });
      await searchService.refreshIndex();

      expect(await search(parameter, "Redis 6.2")).toEqual([]);
      expect(await search(parameter, "Memcached 7.1")).toEqual([applicationId]);

      await prisma.technologyStack.deleteMany({ where: { applicationId } });
      await searchService.refreshIndex();

      expect(await search(parameter, "Memcached 7.1")).toEqual([]);
    });
  });

  it("qPrefix conserve la recherche au fil de la frappe pour les produits", async () => {
    expect(await search("qPrefix", "ngi")).toEqual([nginxId]);
    expect((await search("qPrefix", "Postgre 15.5")).sort()).toEqual(
      [postgresIds.get("15.5"), postgresIds.get("15.5.2")].sort(),
    );
  });

  it("qPrefix retrouve un produit pointé par ses mots partiels", async () => {
    expect(await search("qPrefix", "Node j")).toEqual([nodeJsId]);
  });

  it("qPrefix conserve les préfixes numériques dans le nom de l'application", async () => {
    expect(await search("qPrefix", "Budget 20")).toEqual([budgetId]);
  });
});
