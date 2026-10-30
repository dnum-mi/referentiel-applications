import type { INestApplication } from "@nestjs/common";
import { faker } from "@faker-js/faker";
import { Permission, Roles } from "@prisma/client";
import { ApplicationSearchService } from "src/applications/search/application-search.service";
import request from "supertest";
import { ActorTypeFaker } from "./fakers/actor-type.faker";
import { getPrismaClient } from "./fakers/prisma";
import { getToken } from "./getToken";
import { setupApp } from "./setup";

interface SearchResult {
  results: { id: string }[];
  total: number;
  averageIq: number;
}

describe("Recherche globale — confidentialité des technologies", () => {
  const prisma = getPrismaClient();
  const prefix = `techrights${faker.string.alpha({ length: 12, casing: "lower" })}`;
  const applicationIds: string[] = [];
  const userIds: string[] = [];
  const actorTypeIds: string[] = [];
  const organizationIds: string[] = [];
  const tagIds: string[] = [];
  let app: INestApplication;
  let searchService: ApplicationSearchService;
  let restricted: { email: string };
  let other: { email: string };
  let scoped: { email: string };
  let readTypeId: string;
  let denyTypeId: string;
  let privateAppId: string;
  let readableAppId: string;
  let publicNameAppId: string;
  let outsideReadableAppId: string;
  let outsideDeniedAppId: string;

  async function createUser(role: Roles, scopeOrganizationId?: string) {
    const user = await prisma.user.create({
      data: {
        email: `${prefix}-${userIds.length}@example.test`,
        role,
        additionalPermissions: [],
        scopeOrganizationId,
      },
    });
    userIds.push(user.id);
    return user;
  }

  async function createApplication(
    label: string,
    quality: number,
    actors: { email: string; actorTypeId: string; organizationId?: string }[],
    technology?: { product: string; version?: string },
  ) {
    const application = await prisma.application.create({
      data: {
        label: `${prefix} ${label}`,
        description: "Fixture de confidentialité de la recherche",
        purposes: [],
        targetPopulations: [],
        quality,
        actors: { create: actors },
        ...(technology
          ? {
              technologies: {
                create: { technology: "Composant", ...technology },
              },
            }
          : {}),
      },
    });
    applicationIds.push(application.id);
    return application.id;
  }

  async function search(
    parameter: "q" | "qPrefix",
    query: string,
    user = restricted,
    pagination: { page?: number; pageSize?: number } = {},
  ): Promise<SearchResult> {
    const response = await request(app.getHttpServer())
      .get("/applications")
      .set("Authorization", `Bearer ${getToken(user)}`)
      .query({ label: prefix, [parameter]: query, pageSize: 0, ...pagination })
      .expect(200);
    return response.body;
  }

  const resultIds = (result: SearchResult) =>
    result.results.map((application) => application.id);

  const technologies = (applicationId: string, user = restricted) =>
    request(app.getHttpServer())
      .get(`/applications/${applicationId}/technologies`)
      .set("Authorization", `Bearer ${getToken(user)}`);

  beforeAll(async () => {
    app = await setupApp();
    searchService = app.get(ApplicationSearchService);
    restricted = await createUser(Roles.VISITOR);
    other = await createUser(Roles.VISITOR);
    const readType = await ActorTypeFaker.create([Permission.TechnologyRead]);
    const denyType = await ActorTypeFaker.create([]);
    readTypeId = readType.id;
    denyTypeId = denyType.id;
    actorTypeIds.push(readTypeId, denyTypeId);

    privateAppId = await createApplication(
      "Dossier privé",
      10,
      [
        { email: restricted.email, actorTypeId: denyTypeId },
        { email: other.email, actorTypeId: readTypeId },
      ],
      { product: "Prismadb", version: "37.14" },
    );
    readableAppId = await createApplication(
      "Dossier accessible",
      80,
      [
        { email: restricted.email, actorTypeId: readTypeId },
        { email: other.email, actorTypeId: denyTypeId },
      ],
      { product: "Prismadb", version: "37.14" },
    );
    publicNameAppId = await createApplication(
      "Dossier Prismadb",
      40,
      [
        { email: restricted.email, actorTypeId: denyTypeId },
        { email: other.email, actorTypeId: denyTypeId },
      ],
      { product: "Prismadb", version: "37.14" },
    );

    const scope = await prisma.organization.create({
      data: { path: `/${prefix}/A` },
    });
    const outside = await prisma.organization.create({
      data: { path: `/${prefix}/B` },
    });
    organizationIds.push(scope.id, outside.id);
    scoped = await createUser(Roles.READER, scope.id);
    outsideReadableAppId = await createApplication(
      "Mandat hors périmètre",
      60,
      [
        {
          email: scoped.email,
          actorTypeId: readTypeId,
          organizationId: outside.id,
        },
      ],
      { product: "ScopeactorDB", version: "8.2" },
    );
    outsideDeniedAppId = await createApplication(
      "Sans mandat hors périmètre",
      20,
      [
        {
          email: scoped.email,
          actorTypeId: denyTypeId,
          organizationId: outside.id,
        },
      ],
      { product: "ScopeactorDB", version: "8.2" },
    );
    await searchService.refreshIndex();
  });

  afterAll(async () => {
    try {
      await prisma.application.deleteMany({
        where: { id: { in: applicationIds } },
      });
      if (searchService) await searchService.refreshIndex();
      await prisma.tag.deleteMany({ where: { id: { in: tagIds } } });
      await prisma.actorType.deleteMany({
        where: { id: { in: actorTypeIds } },
      });
      await prisma.userConnexionLog.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      await prisma.organization.deleteMany({
        where: { id: { in: organizationIds } },
      });
    } finally {
      if (app) await app.close();
      await prisma.$disconnect();
    }
  });

  it("établit des droits de lecture différents sur les technologies des fixtures", async () => {
    await technologies(privateAppId).expect(403);
    await technologies(readableAppId).expect(200);
    await technologies(publicNameAppId).expect(403);
    await technologies(privateAppId, other).expect(200);
  });

  it("applique les mêmes droits à un produit partiellement saisi dans l'en-tête", async () => {
    const result = await search("qPrefix", "Prisma");
    expect(resultIds(result).sort()).toEqual(
      [readableAppId, publicNameAppId].sort(),
    );
  });

  describe.each(["q", "qPrefix"] as const)("%s", (parameter) => {
    it("exclut un produit interdit mais conserve le même mot dans un nom public", async () => {
      const result = await search(parameter, "Prismadb");
      expect(resultIds(result).sort()).toEqual(
        [readableAppId, publicNameAppId].sort(),
      );
      expect(result.total).toBe(2);
      expect(result.averageIq).toBe(60);
    });

    it.each(["37.14", "Prismadb 37.14"])(
      "ne révèle pas les versions interdites avec la recherche %s",
      async (query) => {
        const result = await search(parameter, query);
        expect(resultIds(result)).toEqual([readableAppId]);
        expect(result.total).toBe(1);
        expect(result.averageIq).toBe(80);
      },
    );

    it("combine les mots publics et techniques uniquement lorsque la technologie est lisible", async () => {
      const result = await search(parameter, "Dossier Prismadb");
      expect(resultIds(result).sort()).toEqual(
        [readableAppId, publicNameAppId].sort(),
      );
    });

    it("conserve la recherche par nom pour une application dont les technologies sont interdites", async () => {
      expect(resultIds(await search(parameter, "Dossier privé"))).toEqual([
        privateAppId,
      ]);
    });

    it("filtre avant le comptage, la moyenne IQ et la pagination", async () => {
      const ids: string[] = [];
      for (const page of [0, 1]) {
        const result = await search(parameter, "Prismadb", restricted, {
          page,
          pageSize: 1,
        });
        expect(result.total).toBe(2);
        expect(result.averageIq).toBe(60);
        expect(result.results).toHaveLength(1);
        ids.push(...resultIds(result));
      }
      expect(ids.sort()).toEqual([readableAppId, publicNameAppId].sort());
      expect(
        await search(parameter, "Prismadb", restricted, {
          page: 2,
          pageSize: 1,
        }),
      ).toMatchObject({
        results: [],
        total: 2,
        averageIq: 60,
      });
    });

    it("ne partage pas les correspondances techniques en cache entre deux utilisateurs", async () => {
      expect(
        resultIds(await search(parameter, "Prismadb", other)).sort(),
      ).toEqual([privateAppId, publicNameAppId].sort());
      expect(
        resultIds(await search(parameter, "Prismadb", restricted)).sort(),
      ).toEqual([readableAppId, publicNameAppId].sort());
    });

    it("applique immédiatement le retrait de TechnologyRead sans rafraîchir l'index", async () => {
      expect(resultIds(await search(parameter, "Prismadb"))).toContain(
        readableAppId,
      );
      await prisma.appPermissions.update({
        where: { actorTypeId: readTypeId },
        data: { TechnologyRead: false },
      });
      try {
        await technologies(readableAppId).expect(403);
        const result = await search(parameter, "Prismadb");
        expect(resultIds(result)).toEqual([publicNameAppId]);
        expect(result.total).toBe(1);
        expect(result.averageIq).toBe(40);
      } finally {
        await prisma.appPermissions.update({
          where: { actorTypeId: readTypeId },
          data: { TechnologyRead: true },
        });
      }
    });

    it("conserve les droits d'acteur hors périmètre sans exiger TechnologyList", async () => {
      await request(app.getHttpServer())
        .get("/technologies/end-of-life")
        .set("Authorization", `Bearer ${getToken(scoped)}`)
        .expect(403);
      await technologies(outsideReadableAppId, scoped).expect(200);
      await technologies(outsideDeniedAppId, scoped).expect(403);
      expect(
        resultIds(await search(parameter, "ScopeactorDB 8.2", scoped)),
      ).toEqual([outsideReadableAppId]);
    });

    it("une technologie interdite ne modifie pas le classement de résultats déjà publics", async () => {
      const rankQuery = `rank${faker.string.alpha({ length: 12, casing: "lower" })}`;
      const actor = { email: restricted.email, actorTypeId: denyTypeId };
      const first = await createApplication(`${rankQuery} A`, 50, [actor]);
      const second = await createApplication(`${rankQuery} B`, 50, [actor]);
      await searchService.refreshIndex();
      const before = resultIds(await search(parameter, rankQuery));
      expect([...before].sort()).toEqual([first, second].sort());
      // Ajouter une occurrence privée au dernier résultat ne doit pas le favoriser.
      await prisma.technologyStack.create({
        data: {
          applicationId: before[1],
          technology: "Composant",
          product: rankQuery,
          version: "9.1",
        },
      });
      await searchService.refreshIndex();
      expect(resultIds(await search(parameter, rankQuery))).toEqual(before);
    });
  });

  it("n'évince pas une correspondance publique derrière 1000 technologies interdites", async () => {
    const query = `limit${faker.string.alpha({ length: 12, casing: "lower" })}`;
    const privateApplications = Array.from({ length: 1000 }, (_, index) => ({
      id: faker.string.uuid(),
      label: `${prefix} Application pour le plafond ${index}`,
      description: "Fixture du plafond des résultats",
      purposes: [],
      targetPopulations: [],
      quality: 10,
    }));
    applicationIds.push(...privateApplications.map(({ id }) => id));
    await prisma.application.createMany({ data: privateApplications });
    await prisma.actor.createMany({
      data: privateApplications.map(({ id }) => ({
        applicationId: id,
        email: restricted.email,
        actorTypeId: denyTypeId,
      })),
    });
    // Les occurrences privées répétées (poids C) précèdent le tag public
    // (une occurrence, même poids) si le plafond est appliqué avant les droits.
    await prisma.technologyStack.createMany({
      data: privateApplications.map(({ id }) => ({
        applicationId: id,
        technology: "Composant",
        product: `${query} ${query} ${query}`,
      })),
    });
    const publicApplicationId = await createApplication(
      "Application avec tag public",
      80,
      [{ email: restricted.email, actorTypeId: denyTypeId }],
    );
    const tag = await prisma.tag.create({
      data: {
        name: query,
        applications: { connect: { id: publicApplicationId } },
      },
    });
    tagIds.push(tag.id);
    await searchService.refreshIndex();

    const result = await search("qPrefix", query);
    expect(resultIds(result)).toEqual([publicApplicationId]);
    expect(result.total).toBe(1);
    expect(result.averageIq).toBe(80);
  });
});
