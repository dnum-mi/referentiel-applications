import { ApplicationService } from "src/applications/application.service";
import { ApplicationExportService } from "src/applications/export.service";
import type { Requestor } from "src/user/entities/user.entity";
import { Permission, Roles } from "@prisma/client";
import * as ExcelJS from "exceljs";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { getPrismaClient } from "./fakers/prisma";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

describe("Homologation — liste, compteur et export (#2975)", () => {
  const app = setupTestSuite();
  const prefix = `homologation-${randomUUID()}`;
  const ids: string[] = [];
  let token: string;
  let restrictedReader: Requestor;
  const query = { label: prefix, sortBy: "label", order: "asc", pageSize: 0 };
  beforeAll(async () => {
    const prisma = getPrismaClient();
    const admin = await prisma.user.create({
      data: {
        email: `${prefix}@example.test`,
        role: Roles.ADMIN,
        additionalPermissions: [Permission.BetaFeatures],
      },
    });
    token = getToken(admin);
    const scope = await prisma.organization.create({ data: { path: prefix } });
    const reader = await prisma.user.create({
      data: {
        email: `${prefix}-reader@example.test`,
        role: Roles.VISITOR,
        scopeOrganizationId: scope.id,
        additionalPermissions: [
          Permission.AppRead,
          Permission.DataExport,
          Permission.BetaFeatures,
        ],
      },
    });
    restrictedReader = {
      ...reader,
      permissions: [Permission.AppRead],
      additionalPermissions: [Permission.DataExport],
    };
    const fixtures = [
      {
        homologation_status: "homologuee",
        homologation_date_end: new Date("2026-11-08T12:00:00Z"),
      },
      {
        homologation_status: "homologuee",
        homologation_date_end: new Date("2026-11-08T23:00:00Z"),
      },
      {
        homologation_status: "homologuee",
        homologation_date_end: new Date("2026-11-09T22:59:59Z"),
      },
      {
        homologation_status: "homologuee",
        homologation_date_end: new Date("2026-11-09T23:00:00Z"),
      },
      {
        homologation_status: "dispensee",
        homologation_date_end: new Date("2026-11-09T12:00:00Z"),
      },
      { homologation_status: "en_cours" },
      undefined,
    ] as const;
    for (const [index, compliance] of fixtures.entries()) {
      const application = await prisma.application.create({
        data: {
          label: `${prefix}-${index}`,
          description: "Fixture homologation #2975",
          quality: 100,
          ...(compliance ? { compliance: { create: compliance } } : {}),
          ...(index === 1
            ? {
                actors: {
                  create: { email: reader.email, organizationId: scope.id },
                },
              }
            : {}),
        },
      });
      ids.push(application.id);
    }
  });
  async function list(extra = {}, auth = token) {
    const response = await request(app().getHttpServer())
      .get("/applications")
      .set("Authorization", `Bearer ${auth}`)
      .query({ ...query, ...extra })
      .expect(200);
    return response.body as { total: number; results: { id: string }[] };
  }
  async function exportedIds(extra: Record<string, unknown>, auth = token) {
    const response = await request(app().getHttpServer())
      .get("/applications/export/excel")
      .set("Authorization", `Bearer ${auth}`)
      .query({ ...query, ...extra, pageSize: 1 })
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(response.body as ArrayBuffer);
    const result: string[] = [];
    workbook.worksheets[0].eachRow((row, number) => {
      if (number > 1) result.push(String(row.getCell(1).value));
    });
    return result;
  }
  const range = {
    homologationDateMode: "range",
    homologationDateFrom: "2026-11-09",
    homologationDateTo: "2026-11-09",
  };
  it("inclut les deux limites calendaires et garde la dispense consultable", async () => {
    const result = await list(range);
    expect(result.results.map((item) => item.id)).toEqual([
      ids[1],
      ids[2],
      ids[4],
    ]);
    expect((await list({ ...range, pageSize: 1 })).total).toBe(3);
    expect(await exportedIds(range)).toEqual(
      result.results.map((item) => item.id),
    );
  });
  it("combine statut et date sans inclure une dispense", async () => {
    expect(
      (await list({ ...range, homologationStatus: "homologuee" })).results.map(
        (item) => item.id,
      ),
    ).toEqual([ids[1], ids[2]]);
  });
  it("inclut une déclaration absente parmi les dates inconnues", async () => {
    expect(
      (await list({ homologationDateMode: "missing" })).results.map(
        (item) => item.id,
      ),
    ).toEqual([ids[5], ids[6]]);
  });
  it("respecte les mêmes droits dans le compteur, la liste et le fichier", async () => {
    // AppList permet le catalogue global ; AppRead seul limite aux applications associées.
    const filters = {
      ...query,
      ...range,
      order: "asc",
      homologationDateMode: "range",
    } as const;
    const service = app().get(ApplicationService);
    const result = await service.search(filters, restrictedReader);
    expect(result.total).toBe(1);
    expect(result.results.map((item) => item.id)).toEqual([ids[1]]);
    const buffer = await app()
      .get(ApplicationExportService)
      .exportSearchResultsToExcel(filters, restrictedReader);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    expect(workbook.worksheets[0].rowCount).toBe(2);
    expect(workbook.worksheets[0].getRow(2).getCell(1).value).toBe(ids[1]);
  });
  it.each([
    { homologationDateMode: "range" },
    { ...range, homologationDateFrom: "2026-11-10" },
    { ...range, homologationDateFrom: "2026-02-30" },
  ])("rejette un filtre invalide %j", async (extra) => {
    await request(app().getHttpServer())
      .get("/applications")
      .set("Authorization", `Bearer ${token}`)
      .query({ ...query, ...extra })
      .expect(400);
  });
});
