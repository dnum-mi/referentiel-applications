import type { INestApplication } from "@nestjs/common";
import { faker } from "@faker-js/faker";
import { Permission, Roles } from "@prisma/client";
import * as ExcelJS from "exceljs";
import { ApplicationSearchService } from "src/applications/search/application-search.service";
import { EOL_SOON_MS } from "src/technology/utils/eol-status";
import request from "supertest";
import { getPrismaClient } from "./fakers/prisma";
import { getToken } from "./getToken";
import { setupApp } from "./setup";

describe("Applications — filtre de fin de vie des technologies (#2524)", () => {
  const prisma = getPrismaClient();
  const prefix = `eolfilter${faker.string.alpha({ length: 12, casing: "lower" })}`;
  const ids = new Map<string, string>();
  const userIds: string[] = [];
  const organizationIds: string[] = [];
  const divisionIds: string[] = [];
  const day = 24 * 60 * 60 * 1000;
  let app: INestApplication;
  let searchService: ApplicationSearchService;
  let token: string;
  let scopedToken: string;
  let withoutCapabilityToken: string;
  let visitorToken: string;
  let actorTypeId: string;

  const createApplication = async (
    name: string,
    dates: { eolDate?: Date | null; eoasDate?: Date | null }[],
    organizationId?: string,
    businessDivisionId?: string,
  ) => {
    const application = await prisma.application.create({
      data: {
        label: `${prefix} ${name}`,
        description: "Application de test du filtre de fin de vie",
        purposes: [],
        targetPopulations: [],
        quality: 100,
        technologies: {
          create: dates.map((date, index) => ({
            technology: "Composant",
            product: `Produit ${index}`,
            ...date,
          })),
        },
        ...(organizationId
          ? {
              actors: {
                create: {
                  actorTypeId,
                  organizationId,
                  email: "actor@example.test",
                },
              },
            }
          : {}),
        ...(businessDivisionId
          ? { businessDivisions: { connect: { id: businessDivisionId } } }
          : {}),
      },
    });
    ids.set(name, application.id);
  };

  const createUser = async (
    role: Roles,
    additionalPermissions: Permission[],
    scopeOrganizationId?: string,
  ) => {
    const user = await prisma.user.create({
      data: {
        email: `${prefix}-${userIds.length}@example.test`,
        role,
        additionalPermissions,
        scopeOrganizationId,
      },
    });
    userIds.push(user.id);
    return getToken(user);
  };

  const search = (
    query: Record<string, string | number> = {},
    authorization = token,
  ) =>
    request(app.getHttpServer())
      .get("/applications")
      .query({ label: prefix, pageSize: 0, ...query })
      .set("Authorization", `Bearer ${authorization}`);

  const resultIds = (body: { results: { id: string }[] }) =>
    body.results.map((application) => application.id).sort();

  beforeAll(async () => {
    app = await setupApp();
    searchService = app.get(ApplicationSearchService);
    token = await createUser(Roles.READER, [
      Permission.TechnologyList,
      Permission.DataExport,
    ]);
    withoutCapabilityToken = await createUser(Roles.READER, []);
    visitorToken = await createUser(Roles.VISITOR, [Permission.TechnologyList]);

    const actorType = await prisma.actorType.create({
      data: { code: prefix, label: prefix, description: "Acteur de test" },
    });
    actorTypeId = actorType.id;
    const scopePath = `/${prefix}/SG`;
    const organizations = [];
    for (const path of [
      scopePath,
      `${scopePath}/SERVICE`,
      `${scopePath}AMI`,
      `/AUTRE/${prefix}`,
    ]) {
      const organization = await prisma.organization.create({ data: { path } });
      organizations.push(organization);
      organizationIds.push(organization.id);
    }
    scopedToken = await createUser(
      Roles.READER,
      [Permission.TechnologyList, Permission.DataExport],
      organizations[0].id,
    );
    const division = await prisma.businessDivision.create({
      data: {
        label: `${prefix} domaine`,
        organizations: { connect: { id: organizations[1].id } },
      },
    });
    divisionIds.push(division.id);

    const now = Date.now();
    const expired = {
      eolDate: new Date(now - day),
      eoasDate: new Date(now - 2 * day),
    };
    const upcoming = {
      eolDate: new Date(now + day),
      eoasDate: new Date(now - day),
    };
    const supportEnded = { eolDate: null, eoasDate: new Date(now - day) };
    await createApplication("expired", [expired]);
    await createApplication("upcoming", [upcoming]);
    await createApplication("support-ended", [supportEnded]);
    await createApplication("support-ended-distant-eol", [
      { ...supportEnded, eolDate: new Date(now + EOL_SOON_MS + day) },
    ]);
    await createApplication("mixed", [
      expired,
      expired,
      upcoming,
      supportEnded,
    ]);
    await createApplication("healthy", [
      {
        eolDate: new Date(now + EOL_SOON_MS + day),
        eoasDate: new Date(now + day),
      },
    ]);
    await createApplication("unknown", [{}]);
    await createApplication("without-technology", []);
    await createApplication("scope-exact", [expired], organizations[0].id);
    await createApplication("scope-child", [expired], organizations[1].id);
    await createApplication(
      "scope-prefix-collision",
      [expired],
      organizations[2].id,
    );
    await createApplication("scope-outside", [expired], organizations[3].id);
    await createApplication(
      "scope-division",
      [expired],
      undefined,
      division.id,
    );
    await searchService.refreshIndex();
  });

  afterAll(async () => {
    try {
      await prisma.application.deleteMany({
        where: { id: { in: [...ids.values()] } },
      });
      if (searchService) await searchService.refreshIndex();
      await prisma.savedFilter.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.userConnexionLog.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.actionLog.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.metadata.deleteMany({
        where: { createdById: { in: userIds } },
      });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      await prisma.organization.deleteMany({
        where: { id: { in: organizationIds } },
      });
      await prisma.businessDivision.deleteMany({
        where: { id: { in: divisionIds } },
      });
      if (actorTypeId)
        await prisma.actorType.delete({ where: { id: actorTypeId } });
    } finally {
      if (app) await app.close();
      await prisma.$disconnect();
    }
  });

  const expectedEolNames = [
    "expired",
    "mixed",
    "scope-exact",
    "scope-child",
    "scope-prefix-collision",
    "scope-outside",
    "scope-division",
  ];

  it.each([
    ["eol", expectedEolNames],
    ["eol-soon", ["upcoming", "mixed"]],
    ["eoas-passed", ["support-ended", "support-ended-distant-eol", "mixed"]],
  ])(
    "%s retient les bonnes applications, sans doublons entre technologies",
    async (status, names) => {
      const response = await search({
        technologyEolStatus: status as string,
      }).expect(200);
      expect(resultIds(response.body)).toEqual(
        (names as string[]).map((name) => ids.get(name)).sort(),
      );
      expect(response.body.total).toBe(names.length);
    },
  );

  it("sans filtre, conserve aussi les technologies saines, inconnues et les applications sans technologie", async () => {
    const response = await search({}, withoutCapabilityToken).expect(200);
    expect(resultIds(response.body)).toEqual([...ids.values()].sort());
  });

  it.each(["q", "qPrefix"])(
    "combine %s, le statut et la pagination avant de calculer le total",
    async (parameter) => {
      const response = await search({
        [parameter]: prefix,
        technologyEolStatus: "eol",
        pageSize: 1,
      }).expect(200);
      expect(response.body.results).toHaveLength(1);
      expect(response.body.total).toBe(expectedEolNames.length);
      expect(expectedEolNames.map((name) => ids.get(name))).toContain(
        response.body.results[0].id,
      );
    },
  );

  it.each(["all", "unknown", "eol,eol-soon"])(
    "refuse la valeur de statut invalide %s",
    async (status) => {
      await search({ technologyEolStatus: status }).expect(400);
    },
  );

  it("refuse la lecture transverse sans capacité globale ou avec le rôle VISITOR", async () => {
    await search({ technologyEolStatus: "eol" }, withoutCapabilityToken).expect(
      403,
    );
    await search({ technologyEolStatus: "eol" }, visitorToken).expect(403);
  });

  it("borne au périmètre exact, aux descendants et aux domaines métier, même avec une recherche client", async () => {
    const response = await search(
      { technologyEolStatus: "eol", search: prefix },
      scopedToken,
    ).expect(200);
    expect(resultIds(response.body)).toEqual(
      ["scope-exact", "scope-child", "scope-division"]
        .map((name) => ids.get(name))
        .sort(),
    );
    expect(response.body.total).toBe(3);
    const outside = await search(
      { technologyEolStatus: "eol", organization: `/AUTRE/${prefix}` },
      scopedToken,
    ).expect(200);
    expect(outside.body.total).toBe(0);
  });

  it("sauvegarde puis rejoue le filtre de statut", async () => {
    const saved = await request(app.getHttpServer())
      .post("/saved-filters")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Fin de vie proche",
        filters: { label: prefix, technologyEolStatus: "eol-soon" },
      })
      .expect(201);
    const listed = await request(app.getHttpServer())
      .get("/saved-filters")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    const filter = listed.body.find(
      (item: { id: string }) => item.id === saved.body.id,
    );
    expect(filter.filters.technologyEolStatus).toBe("eol-soon");
    const response = await search(filter.filters).expect(200);
    expect(resultIds(response.body)).toEqual(
      [ids.get("upcoming"), ids.get("mixed")].sort(),
    );
  });

  it("exporte le même ensemble filtré et scopé, sans appliquer la pagination", async () => {
    const response = await request(app.getHttpServer())
      .get("/applications/export/excel")
      .query({
        label: prefix,
        technologyEolStatus: "eol",
        pageSize: 1,
        page: 1,
      })
      .set("Authorization", `Bearer ${scopedToken}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(response.body as ArrayBuffer);
    const exportedIds: string[] = [];
    workbook.worksheets[0].eachRow((row, rowNumber) => {
      if (rowNumber > 1) exportedIds.push(String(row.getCell(1).value));
    });
    expect(exportedIds.sort()).toEqual(
      ["scope-exact", "scope-child", "scope-division"]
        .map((name) => ids.get(name))
        .sort(),
    );
  });
});
