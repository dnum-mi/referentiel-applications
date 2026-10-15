import type { Prisma, Status } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { Permission, Roles, TechnologyEolSource } from "@prisma/client";
import * as ExcelJS from "exceljs";
import * as endoflife from "src/technology/utils/endoflife.utils";
import request from "supertest";
import { ActorTypeFaker } from "./fakers/actor-type.faker";
import { getPrismaClient } from "./fakers/prisma";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

describe("Exports Excel des technologies (#2524)", () => {
  const app = setupTestSuite();
  const prisma = getPrismaClient();
  const prefix = `technology-export-${randomUUID()}`;
  const permissions = [Permission.TechnologyList, Permission.DataExport];
  const columns = [
    "ID Application",
    "Application",
    "Technologie",
    "Produit",
    "Version",
    "Fin de vie (EOL)",
    "Fin de support actif (EOAS)",
    "Dernière version",
    "Source",
    "Statut",
  ];
  const past = new Date("2020-01-01T00:00:00.000Z");
  const distant = new Date("2099-01-01T00:00:00.000Z");
  const soon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  let scopeId: string;
  let outsidePath: string;
  let directId: string;
  let childId: string;
  let divisionId: string;
  let sharedId: string;
  let inScopeIds: string[];
  let activeIds: string[];
  let reader: Awaited<ReturnType<typeof UserFaker.create>>;

  async function makeUser(
    role: Roles,
    additionalPermissions: Permission[],
    scoped = false,
  ) {
    const user = await UserFaker.create({ role, additionalPermissions });
    if (scoped) {
      await user.update({ scopeOrganization: { connect: { id: scopeId } } });
    }
    return user;
  }

  function download(
    user: { email: string },
    query: Record<string, string | number> = {},
  ) {
    return request(app().getHttpServer())
      .get("/technologies/end-of-life/export")
      .set("Authorization", `Bearer ${getToken(user)}`)
      .query({ search: prefix, status: "all", ...query })
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => callback(null, Buffer.concat(chunks)));
      });
  }

  async function readWorkbook(response: request.Response) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(response.body as ArrayBuffer);
    return workbook;
  }

  function technologyRows(workbook: ExcelJS.Workbook) {
    const sheet = workbook.getWorksheet("Technologies");
    expect(sheet).toBeDefined();
    expect(sheet!.getRow(1).values).toEqual([undefined, ...columns]);
    const rows: ExcelJS.CellValue[][] = [];
    sheet!.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        rows.push(columns.map((_, index) => row.getCell(index + 1).value));
      }
    });
    return rows;
  }

  beforeAll(async () => {
    const parent = await prisma.organization.create({
      data: { path: `/${prefix}` },
    });
    const scope = await prisma.organization.create({
      data: { path: `/${prefix}/A`, parentId: parent.id },
    });
    // Le chemin du descendant diffère aussi par sa casse de celui du périmètre.
    const child = await prisma.organization.create({
      data: { path: `/${prefix.toUpperCase()}/a/CHILD`, parentId: scope.id },
    });
    const similar = await prisma.organization.create({
      data: { path: `/${prefix}/AB` },
    });
    const outside = await prisma.organization.create({
      data: { path: `/${prefix}/B` },
    });
    scopeId = scope.id;
    outsidePath = outside.path;
    const division = await prisma.businessDivision.create({
      data: { label: prefix, organizations: { connect: { id: child.id } } },
    });

    async function createApplication(
      suffix: string,
      shortName: string,
      organizationIds: string[],
      technologies: Prisma.TechnologyStackCreateWithoutApplicationInput[] = [
        { technology: "Runtime", product: `${prefix}-obsolete`, eolDate: past },
      ],
      status: Status = "in_production",
      businessDivisionId?: string,
    ) {
      const application = await prisma.application.create({
        data: {
          label: `${prefix}-${suffix}`,
          shortName,
          description: "Fixture des exports de technologies",
          quality: 100,
          actors: {
            create: organizationIds.map((organizationId) => ({
              organizationId,
            })),
          },
          technologies: { create: technologies },
          ...(businessDivisionId
            ? { businessDivisions: { connect: { id: businessDivisionId } } }
            : {}),
        },
      });
      const currentStatus = await prisma.applicationStatus.create({
        data: { applicationId: application.id, status },
      });
      await prisma.application.update({
        where: { id: application.id },
        data: { currentStatusId: currentStatus.id },
      });
      return application.id;
    }

    directId = await createApplication(
      "a-direct",
      "Z",
      [scope.id],
      [
        {
          technology: "Base de données",
          product: `${prefix}-PostgreSQL`,
          version: "13",
          eolDate: past,
          eoasDate: past,
          latestVersion: "13.22",
          eolSource: TechnologyEolSource.endoflife,
        },
        {
          technology: "Composant",
          product: `${prefix}-manual`,
          eolDate: soon,
          eolSource: TechnologyEolSource.manual,
        },
        {
          technology: "Langage",
          product: `${prefix}-support`,
          eolDate: distant,
          eoasDate: past,
        },
        { technology: "Runtime", product: `${prefix}-healthy` },
      ],
    );
    childId = await createApplication("b-child", "Y", [child.id]);
    divisionId = await createApplication(
      "c-division",
      "X",
      [],
      undefined,
      undefined,
      division.id,
    );
    sharedId = await createApplication("d-shared", "W", [scope.id, outside.id]);
    inScopeIds = [directId, childId, divisionId, sharedId];
    activeIds = [
      ...inScopeIds,
      await createApplication("outside", "V", [outside.id]),
      await createApplication("similar", "U", [similar.id]),
      await createApplication("parent", "T", [parent.id]),
      await createApplication("orphan", "S", []),
    ];
    await createApplication("deleted", "R", [scope.id], undefined, "deleted");
    reader = await makeUser(Roles.READER, permissions, true);
  });

  describe("GET /technologies/end-of-life/export", () => {
    it("exige une authentification", async () => {
      await request(app().getHttpServer())
        .get("/technologies/end-of-life/export")
        .expect(401);
    });

    it.each([Roles.READER, Roles.CONTRIBUTOR])(
      "%s doit cumuler TechnologyList et DataExport",
      async (role) => {
        for (const grants of [
          [],
          [Permission.TechnologyList],
          [Permission.DataExport],
        ]) {
          await download(await makeUser(role, grants)).expect(403);
        }
        await download(await makeUser(role, permissions)).expect(200);
      },
    );

    it("refuse le rôle VISITOR même avec les deux capacités", async () => {
      await download(await makeUser(Roles.VISITOR, permissions)).expect(403);
    });

    it("ouvre l'export à ADMIN avec les capacités de son rôle", async () => {
      const response = await download(await makeUser(Roles.ADMIN, [])).expect(
        200,
      );
      const rows = technologyRows(await readWorkbook(response));
      expect([...new Set(rows.map((row) => row[0]))].sort()).toEqual(
        [...activeIds].sort(),
      );
    });

    it("exporte les champs persistés, les dates et les quatre statuts français sans appel externe", async () => {
      const enabled = jest
        .spyOn(endoflife, "isEndoflifeDisabled")
        .mockReturnValue(false);
      const resolve = jest
        .spyOn(endoflife, "resolveProductReleases")
        .mockRejectedValue(new Error("Appel externe interdit"));
      const catalog = jest
        .spyOn(endoflife, "fetchProductCatalog")
        .mockRejectedValue(new Error("Appel externe interdit"));
      try {
        const response = await download(reader, {
          search: `${prefix}-a-direct`,
        }).expect(200);
        expect(response.headers["content-type"]).toContain(
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        expect(response.headers["content-disposition"]).toContain(".xlsx");
        const workbook = await readWorkbook(response);
        expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
          "Technologies",
        ]);
        const rows = technologyRows(workbook);
        expect(rows).toHaveLength(4);
        expect(rows).toContainEqual([
          directId,
          `${prefix}-a-direct`,
          "Base de données",
          `${prefix}-PostgreSQL`,
          "13",
          "2020-01-01",
          "2020-01-01",
          "13.22",
          "endoflife.date",
          "Fin de vie dépassée",
        ]);
        expect(rows).toContainEqual([
          directId,
          `${prefix}-a-direct`,
          "Composant",
          `${prefix}-manual`,
          "",
          soon.toISOString().slice(0, 10),
          "",
          "",
          "Saisie manuelle",
          "Fin de vie proche",
        ]);
        expect(rows.find((row) => row[3] === `${prefix}-support`)?.[9]).toBe(
          "Fin de support actif dépassée",
        );
        expect(rows.find((row) => row[3] === `${prefix}-healthy`)?.[9]).toBe(
          "Sans alerte de fin de vie",
        );
        expect(resolve).not.toHaveBeenCalled();
        expect(catalog).not.toHaveBeenCalled();
      } finally {
        enabled.mockRestore();
        resolve.mockRestore();
        catalog.mockRestore();
      }
    });

    it.each([
      { sortBy: "label", order: "desc", ids: () => [...inScopeIds].reverse() },
      {
        sortBy: "shortName",
        order: "asc",
        ids: () => [...inScopeIds].reverse(),
      },
    ])(
      "ignore la pagination et applique le tri $sortBy $order dans le périmètre",
      async ({ sortBy, order, ids }) => {
        const response = await download(reader, {
          page: 2,
          pageSize: 1,
          sortBy,
          order,
        }).expect(200);
        const rows = technologyRows(await readWorkbook(response));
        expect(rows).toHaveLength(7);
        expect([...new Set(rows.map((row) => row[0]))]).toEqual(ids());
      },
    );

    it("combine le filtre d'organisation et le périmètre sans l'élargir", async () => {
      const response = await download(reader, {
        organization: outsidePath,
      }).expect(200);
      expect(
        technologyRows(await readWorkbook(response)).map((row) => row[0]),
      ).toEqual([sharedId]);
      const outside = await download(reader, {
        search: `${prefix}-outside`,
      }).expect(200);
      expect(technologyRows(await readWorkbook(outside))).toEqual([]);
    });

    it.each([
      ["eol", `${prefix}-PostgreSQL`, "Fin de vie dépassée"],
      ["eol-soon", `${prefix}-manual`, "Fin de vie proche"],
      ["eoas-passed", `${prefix}-support`, "Fin de support actif dépassée"],
    ])(
      "le filtre %s ne restitue que les technologies de ce statut",
      async (status, product, label) => {
        const response = await download(reader, {
          search: `${prefix}-a-direct`,
          status,
        }).expect(200);
        const rows = technologyRows(await readWorkbook(response));
        expect(rows).toHaveLength(1);
        expect(rows[0][3]).toBe(product);
        expect(rows[0][9]).toBe(label);
      },
    );

    it("ne confond pas le produit sain recherché avec une autre technologie obsolète", async () => {
      const response = await download(reader, {
        search: `${prefix}-healthy`,
        status: "eol",
      }).expect(200);
      expect(technologyRows(await readWorkbook(response))).toEqual([]);
    });
  });

  describe("GET /applications/export/excel", () => {
    async function visitorWithTechnologyAccess(allowedApplicationId?: string) {
      const visitor = await makeUser(Roles.VISITOR, [Permission.DataExport]);
      const deniedType = await ActorTypeFaker.create([]);
      const allowedType = allowedApplicationId
        ? await ActorTypeFaker.create([Permission.TechnologyRead])
        : undefined;
      await prisma.actor.createMany({
        data: activeIds.map((applicationId) => ({
          applicationId,
          email: visitor.email,
          actorTypeId:
            applicationId === allowedApplicationId
              ? allowedType!.id
              : deniedType.id,
        })),
      });
      return visitor;
    }

    async function exportCatalogue(user: { email: string }) {
      // Le catalogue accepte ses propres filtres et inclut les supprimées sans
      // filtre de statut : cibler explicitement les fiches actives des fixtures.
      const response = await request(app().getHttpServer())
        .get("/applications/export/excel")
        .set("Authorization", `Bearer ${getToken(user)}`)
        .query({
          search: prefix,
          currentStatus__in: "in_production",
          page: 1,
          pageSize: 1,
        })
        .buffer(true)
        .parse((res, callback) => {
          const chunks: Buffer[] = [];
          res.on("data", (chunk: Buffer) => chunks.push(chunk));
          res.on("end", () => callback(null, Buffer.concat(chunks)));
        })
        .expect(200);
      return readWorkbook(response);
    }

    it("ajoute toutes les technologies autorisées, y compris celles sans alerte", async () => {
      const workbook = await exportCatalogue(
        await makeUser(Roles.READER, [Permission.DataExport]),
      );
      const rows = technologyRows(workbook);
      expect(rows).toHaveLength(activeIds.length + 3);
      expect([...new Set(rows.map((row) => row[0]))].sort()).toEqual(
        [...activeIds].sort(),
      );
      expect(rows.find((row) => row[3] === `${prefix}-healthy`)?.[9]).toBe(
        "Sans alerte de fin de vie",
      );
    });

    it("n'expose aucune technologie à VISITOR avec DataExport sans TechnologyRead", async () => {
      const workbook = await exportCatalogue(
        await visitorWithTechnologyAccess(),
      );
      expect(workbook.worksheets[0].rowCount).toBeGreaterThan(1);
      expect(technologyRows(workbook)).toEqual([]);
    });

    it("limite les technologies du catalogue à l'application autorisée par son type d'acteur", async () => {
      const workbook = await exportCatalogue(
        await visitorWithTechnologyAccess(directId),
      );
      const rows = technologyRows(workbook);
      expect(rows).toHaveLength(4);
      expect(rows.every((row) => row[0] === directId)).toBe(true);
      expect(workbook.worksheets[0].rowCount).toBeGreaterThan(2);
    });
  });
});
