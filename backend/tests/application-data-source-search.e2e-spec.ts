import type { INestApplication } from "@nestjs/common";
import type { User } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { Permission, Roles } from "@prisma/client";
import { ApplicationService } from "src/applications/application.service";
import type { Requestor } from "src/user/entities/user.entity";
import request from "supertest";
import { getPrismaClient } from "./fakers/prisma";
import { getToken } from "./getToken";
import { setupApp } from "./setup";

describe("Applications — recherche par donnée utilisée (#2976)", () => {
  const prisma = getPrismaClient();
  const prefix = `data-source-search-${randomUUID()}`;
  const applicationIds: string[] = [];
  const dataDescriptionIds: string[] = [];
  const organizationIds: string[] = [];
  let app: INestApplication;
  let reader: User;
  let token: string;
  let service: ApplicationService;
  let firstConsumerId: string;
  let secondConsumerId: string;
  let thirdConsumerId: string;
  let producerLabel: string;
  let insidePath: string;
  let outsidePath: string;

  interface SearchResult {
    results: { id: string; label: string }[];
    total: number;
  }

  const baseQuery = {
    label: prefix,
    page: 0,
    pageSize: 0,
    sortBy: "label",
    order: "asc" as const,
  };

  async function list(query: Record<string, string | number | boolean> = {}) {
    const response = await request(app.getHttpServer())
      .get("/applications")
      .set("Authorization", `Bearer ${token}`)
      .query({ ...baseQuery, ...query })
      .expect(200);
    return response.body as SearchResult;
  }

  function resultIds(result: SearchResult) {
    return result.results.map((application) => application.id);
  }

  beforeAll(async () => {
    app = await setupApp();
    service = app.get(ApplicationService);
    reader = await prisma.user.create({
      data: { email: `${prefix}@example.test`, role: Roles.READER },
    });
    token = getToken(reader);

    insidePath = `${prefix}/A`;
    outsidePath = `${prefix}/B`;
    const inside = await prisma.organization.create({
      data: { path: insidePath },
    });
    const outside = await prisma.organization.create({
      data: { path: outsidePath },
    });
    organizationIds.push(inside.id, outside.id);

    const createApplication = async (
      label: string,
      organizationId?: string,
      email?: string,
    ) => {
      const application = await prisma.application.create({
        data: {
          label: `${prefix}-${label}`,
          description: "Fixture de recherche par donnée utilisée",
          quality: 100,
          ...(organizationId
            ? { actors: { create: { organizationId, email } } }
            : {}),
        },
      });
      applicationIds.push(application.id);
      return application;
    };

    const first = await createApplication(
      "A-consommateur",
      inside.id,
      reader.email.toUpperCase(),
    );
    const second = await createApplication(
      "B-consommateur",
      outside.id,
      "other@example.test",
    );
    const third = await createApplication(
      "C-consommateur",
      inside.id,
      "another@example.test",
    );
    const producer = await createApplication("D-producteur-Ressource Usagers");
    const otherConsumer = await createApplication("E-autre-donnee");
    await createApplication("F-sans-donnee");
    firstConsumerId = first.id;
    secondConsumerId = second.id;
    thirdConsumerId = third.id;
    producerLabel = producer.label;

    for (const [name, consumerIds] of [
      ["Ressource Usagers", [first.id, second.id]],
      ["Ressource Usagers secondaire", [first.id, third.id]],
      ["Budget", [otherConsumer.id]],
    ] as const) {
      const description = await prisma.dataDescription.create({
        data: {
          name: `${name} ${prefix}`,
          applicationsSource: { connect: { id: producer.id } },
          dataApplications: {
            create: consumerIds.map((applicationId) => ({
              applicationId,
              documentationUrl: [],
            })),
          },
        },
      });
      dataDescriptionIds.push(description.id);
    }
  });

  afterAll(async () => {
    try {
      await prisma.application.deleteMany({
        where: { id: { in: applicationIds } },
      });
      await prisma.dataDescription.deleteMany({
        where: { id: { in: dataDescriptionIds } },
      });
      if (reader) {
        await prisma.userConnexionLog.deleteMany({
          where: { userId: reader.id },
        });
        await prisma.user.delete({ where: { id: reader.id } });
      }
      await prisma.organization.deleteMany({
        where: { id: { in: organizationIds } },
      });
    } finally {
      if (app) await app.close();
      await prisma.$disconnect();
    }
  });

  it.each(["source Usa", "rEsSoUrCe uSaGeRs"])(
    "retrouve les consommateurs par le nom partiel ou sa casse (%s), une fois chacun",
    async (dataSourceName) => {
      const result = await list({ dataSourceName });
      expect(result.total).toBe(3);
      expect(resultIds(result)).toEqual([
        firstConsumerId,
        secondConsumerId,
        thirdConsumerId,
      ]);
    },
  );

  it("ne confond pas une application productrice avec le nom de la donnée utilisée", async () => {
    // Le producteur est relié aux descriptions par applicationsSource seulement ;
    // son nom contient le texte mais il n'a aucun usage DataApplication.
    expect((await list({ dataSourceName: "Ressource Usagers" })).total).toBe(3);
    expect(await list({ dataSourceName: producerLabel })).toMatchObject({
      total: 0,
      results: [],
    });
  });

  it("renvoie une liste vide pour une donnée inexistante au lieu d'une erreur serveur", async () => {
    expect(
      await list({ dataSourceName: `${prefix}-inexistante` }),
    ).toMatchObject({ total: 0, results: [] });
  });

  it("conserve le total filtré et l'ordre lorsque la page change", async () => {
    for (const [page, expectedId] of [
      firstConsumerId,
      secondConsumerId,
      thirdConsumerId,
    ].entries()) {
      const result = await list({
        dataSourceName: "Ressource Usagers",
        page,
        pageSize: 1,
      });
      expect(result.total).toBe(3);
      expect(resultIds(result)).toEqual([expectedId]);
    }
    expect(
      await list({ dataSourceName: "Ressource Usagers", page: 3, pageSize: 1 }),
    ).toMatchObject({ total: 3, results: [] });
  });

  it("combine le nom de donnée avec le filtre d'organisation demandé", async () => {
    const inside = await list({
      dataSourceName: "Ressource Usagers",
      organization: insidePath,
    });
    expect(inside.total).toBe(2);
    expect(resultIds(inside)).toEqual([firstConsumerId, thirdConsumerId]);
    const outside = await list({
      dataSourceName: "Ressource Usagers",
      organization: outsidePath,
    });
    expect(outside.total).toBe(1);
    expect(resultIds(outside)).toEqual([secondConsumerId]);
  });

  it("conserve le filtre Mes applications sans élargir aux autres consommateurs", async () => {
    const result = await list({
      dataSourceName: "Ressource Usagers",
      myApplications: true,
    });
    expect(result.total).toBe(1);
    expect(resultIds(result)).toEqual([firstConsumerId]);
  });

  it("restaure le catalogue normal quand le filtre est effacé", async () => {
    const withoutFilter = await list();
    expect(withoutFilter.total).toBe(applicationIds.length);
    expect(await list({ dataSourceName: "" })).toEqual(withoutFilter);
  });

  it("conserve la restriction de lecture AppRead sans AppList", async () => {
    const requestor: Requestor = {
      ...reader,
      permissions: [Permission.AppRead],
    };
    const result = await service.search(
      { ...baseQuery, dataSourceName: "Ressource Usagers" },
      requestor,
    );
    expect(result.total).toBe(1);
    expect(resultIds(result)).toEqual([firstConsumerId]);
    expect(
      await service.search(
        {
          ...baseQuery,
          dataSourceName: "Ressource Usagers",
          organization: outsidePath,
        },
        requestor,
      ),
    ).toMatchObject({ total: 0, results: [] });
  });

  it("ne fournit aucune donnée à un principal dépourvu de droits de lecture", async () => {
    const requestor: Requestor = {
      ...reader,
      permissions: [],
      additionalPermissions: [],
    };
    expect(
      await service.search(
        { ...baseQuery, dataSourceName: "Ressource Usagers" },
        requestor,
      ),
    ).toMatchObject({ total: 0, results: [] });
  });

  it("refuse la recherche non authentifiée", async () => {
    await request(app.getHttpServer())
      .get("/applications")
      .query({ ...baseQuery, dataSourceName: "Ressource Usagers" })
      .expect(401);
  });
});
