import { Permission, Roles } from "@prisma/client";
import * as ExcelJS from "exceljs";
import request from "supertest";
import { ApplicationFaker } from "./fakers/application.faker";
import { OrganizationFaker } from "./fakers/organization.faker";
import { getPrismaClient } from "./fakers/prisma";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

// B13 : l'export appliquait la pagination par défaut de la recherche (pageSize=15) —
// un client API sans `pageSize=0` ne recevait que 15 lignes.
describe("Exports du catalogue", () => {
  const app = setupTestSuite();
  const prefix = `B13-export-${Date.now()}`;
  const divisionLabel = `${prefix}-Direction`;
  const createdIds: string[] = [];
  let token: string;

  beforeAll(async () => {
    const admin = await UserFaker.create({
      role: Roles.ADMIN,
      additionalPermissions: [Permission.BetaFeatures],
    });
    token = getToken(admin);
    const prisma = getPrismaClient();
    const division = await prisma.businessDivision.create({
      data: { label: divisionLabel },
    });

    // Plus que l'ancienne page par défaut (15).
    for (let i = 0; i < 16; i++) {
      const application = await ApplicationFaker.create(admin);
      await prisma.application.update({
        where: { id: application.id },
        data: {
          label: `${prefix}-${String(i).padStart(2, "0")}`,
          quality: 65,
          businessDivisions: { connect: { id: division.id } },
        },
      });
      createdIds.push(application.id);
    }
  });

  async function readWorkbook(download: request.Test) {
    const response = await download
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(response.body as ArrayBuffer);
    return workbook;
  }

  async function exportedIds(query: Record<string, string | number>) {
    const workbook = await readWorkbook(
      request(app().getHttpServer())
        .get("/applications/export/excel")
        .query(query)
        .set("Authorization", `Bearer ${token}`),
    );
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

  it("exporte les mêmes lignes et le même tri en HTML sans limiter la pagination", async () => {
    const response = await request(app().getHttpServer())
      .get("/applications/export/html")
      .query({
        search: prefix,
        page: 1,
        pageSize: 1,
        sortBy: "label",
        order: "asc",
      })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(response.headers["content-type"]).toMatch(
      /^text\/html;\s*charset=utf-8$/i,
    );
    expect(response.headers["content-disposition"]).toBe(
      "attachment; filename=applications_export.html",
    );
    expect(response.headers["cache-control"]).toBe("no-store");
    const applications = response.text
      .split('id="section-1"')[1]
      .split("</section>")[0];
    expect(applications.match(/<caption>/g)).toHaveLength(16);
    const positions = createdIds.map((id) => applications.indexOf(id));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("refuse le téléchargement HTML sans authentification", async () => {
    await request(app().getHttpServer())
      .get("/applications/export/html")
      .expect(401);
  });

  it("exporte les colonnes choisies, les résultats filtrés au-delà de la page et le contexte", async () => {
    const workbook = await readWorkbook(
      request(app().getHttpServer())
        .post("/applications/export/excel-view")
        .query({
          search: prefix,
          sortBy: "label",
          order: "desc",
          page: 1,
          pageSize: 5,
        })
        .set("Authorization", `Bearer ${token}`)
        .set("Origin", "https://refapp.example.test")
        .send({
          columns: ["label", "quality", "businessDivision", "status"],
          cataloguePath: `/recherche-application?search=${prefix}&order=desc`,
        })
        .expect(
          "Content-Disposition",
          "attachment; filename=applications_vue_export.xlsx",
        ),
    );
    expect(workbook.worksheets.map(({ name }) => name)).toEqual([
      "Vue du catalogue",
      "Contexte",
    ]);
    const [view, context] = workbook.worksheets;
    expect(view.getRow(1).values).toEqual([
      undefined,
      "Nom",
      "IQ",
      "Direction métier",
      "Statut",
    ]);
    expect(view.rowCount).toBe(17);
    expect(view.getRow(2).values).toEqual([
      undefined,
      `${prefix}-15`,
      "65%",
      divisionLabel,
      "En construction",
    ]);
    expect(view.getCell("A17").value).toBe(`${prefix}-00`);
    expect(context.getCell("B3").value).toBe(16);
    expect(context.getCell("B4").value).toMatchObject({
      hyperlink: `https://refapp.example.test/recherche-application?search=${prefix}&order=desc`,
    });
    expect(context.getColumn("B").values).toContain(prefix);
  });

  it("conserve le périmètre de l’administrateur pour le filtre de fin de vie", async () => {
    const scoped = await UserFaker.create({ role: Roles.ADMIN });
    const organization = await OrganizationFaker.create();
    await scoped.update({
      scopeOrganization: { connect: { id: organization.id } },
    });
    const prisma = getPrismaClient();
    await prisma.application.update({
      where: { id: createdIds[0] },
      data: {
        businessDivisions: {
          create: {
            label: `${prefix}-Périmètre`,
            organizations: { connect: { id: organization.id } },
          },
        },
      },
    });
    await prisma.technologyStack.createMany({
      data: createdIds.slice(0, 2).map((applicationId) => ({
        applicationId,
        technology: "Base de données",
        product: "Produit hors support",
        eolSource: "manual",
        eolDate: new Date("2020-01-01"),
      })),
    });

    const workbook = await readWorkbook(
      request(app().getHttpServer())
        .post("/applications/export/excel-view")
        .query({ search: prefix, technologyEolStatus: "eol" })
        .set("Authorization", `Bearer ${getToken(scoped)}`)
        .send({ columns: ["label"] }),
    );
    expect(workbook.worksheets[0].getColumn(1).values).toEqual([
      undefined,
      "Nom",
      `${prefix}-00`,
    ]);
  });

  it("exige le droit d’export et vérifie les colonnes réservées séparément", async () => {
    const visitor = await UserFaker.create({ role: Roles.VISITOR });
    const postExport = (jwt: string) =>
      request(app().getHttpServer())
        .post("/applications/export/excel-view")
        .query({ search: prefix })
        .set("Authorization", `Bearer ${jwt}`);
    await postExport(getToken(visitor))
      .send({ columns: ["label"] })
      .expect(403);

    await visitor.update({ additionalPermissions: [Permission.DataExport] });
    await postExport(getToken(visitor))
      .send({ columns: ["label", "moa"] })
      .expect(403);
    const workbook = await readWorkbook(
      postExport(getToken(visitor)).send({ columns: ["label"] }),
    );
    expect(workbook.worksheets[0].getCell("A1").value).toBe("Nom");
  });

  it("rejette une colonne inconnue ou répétée", async () => {
    for (const columns of [["inconnue"], ["label", "label"]]) {
      await request(app().getHttpServer())
        .post("/applications/export/excel-view")
        .set("Authorization", `Bearer ${token}`)
        .send({ columns })
        .expect(400);
    }
  });
});
