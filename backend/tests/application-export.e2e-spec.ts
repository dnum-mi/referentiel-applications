import { Roles } from "@prisma/client";
import * as ExcelJS from "exceljs";
import request from "supertest";
import { ApplicationFaker } from "./fakers/application.faker";
import { getPrismaClient } from "./fakers/prisma";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

// B13 : l'export appliquait la pagination par défaut de la recherche (pageSize=15) —
// un client API sans `pageSize=0` ne recevait que 15 lignes.
describe("GET /applications/export/excel — export non paginé (B13)", () => {
  const app = setupTestSuite();
  const prefix = `B13-export-${Date.now()}`;
  const createdIds: string[] = [];
  let token: string;

  beforeAll(async () => {
    const admin = await UserFaker.create({ role: Roles.ADMIN });
    token = getToken(admin);
    const prisma = getPrismaClient();

    // Plus que l'ancienne page par défaut (15).
    for (let i = 0; i < 16; i++) {
      const application = await ApplicationFaker.create(admin);
      await prisma.application.update({
        where: { id: application.id },
        data: { label: `${prefix}-${String(i).padStart(2, "0")}` },
      });
      createdIds.push(application.id);
    }
  });

  async function exportedIds(query: Record<string, string | number>) {
    const response = await request(app().getHttpServer())
      .get("/applications/export/excel")
      .query(query)
      .set("Authorization", `Bearer ${token}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(response.body as ArrayBuffer);
    const sheet = workbook.worksheets[0];
    const ids: string[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) ids.push(String(row.getCell(1).value));
    });
    return ids;
  }

  it("exporte toutes les applications sans paramètre", async () => {
    const ids = await exportedIds({});

    expect(ids.length).toBeGreaterThan(15);
    expect(ids).toEqual(expect.arrayContaining(createdIds));
  });

  it("ignore la pagination et filtre en base, dans l'ordre demandé", async () => {
    const ids = await exportedIds({
      search: prefix,
      page: 1,
      pageSize: 1,
      sortBy: "label",
      order: "asc",
    });

    expect(ids).toEqual(createdIds);
  });
});
