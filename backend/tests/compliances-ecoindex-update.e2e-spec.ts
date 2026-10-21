import { Roles } from "@prisma/client";
import * as ExcelJS from "exceljs";
import request from "supertest";
import { sheetLabels } from "src/applications/constants/application-export.sheet-labels";
import { ApplicationFaker } from "./fakers/application.faker";
import { getPrismaClient } from "./fakers/prisma";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

describe("Compliance EcoIndex updates (#2933)", () => {
  const app = setupTestSuite();
  const calculatedAt = new Date("2026-10-01T10:00:00.000Z");
  const oldUrl = "https://old.example.test";
  const newUrl = "https://new.example.test";
  const resetMetrics = {
    eco_index_score: null,
    eco_index_ges: null,
    eco_index_water: null,
    eco_index_last_calculated_at: null,
  };
  const mixedData = {
    dsfr_implemented: true,
    dima_duration_hours: 4,
    rgpd_has_aipd: false,
  };
  let applicationId: string;
  let token: string;

  beforeAll(async () => {
    const user = await UserFaker.create({ role: Roles.ADMIN });
    token = getToken(user);
  });

  beforeEach(async () => {
    const user = await UserFaker.create({ role: Roles.CONTRIBUTOR });
    const application = await ApplicationFaker.create(user);
    applicationId = application.id;
    await getPrismaClient().compliance.create({
      data: {
        applicationId,
        eco_index_target_url: oldUrl,
        eco_index_score: 75,
        eco_index_ges: 1.5,
        eco_index_water: 2,
        eco_index_last_calculated_at: calculatedAt,
        dsfr_implemented: false,
        dima_duration_hours: 24,
        rgpd_has_aipd: true,
        rgpd_dpo_name: "DPO conservé",
      },
    });
  });

  afterEach(async () => {
    await ApplicationFaker.delete(applicationId);
  });

  async function readCompliance() {
    return getPrismaClient().compliance.findUniqueOrThrow({
      where: { applicationId },
    });
  }

  it.each([newUrl, "", null])(
    "persists a mixed PATCH and resets metrics when URL becomes %p",
    async (targetUrl) => {
      const response = await request(app().getHttpServer())
        .patch(`/applications/${applicationId}/compliances`)
        .set("Authorization", `Bearer ${token}`)
        .send({ ...mixedData, eco_index_target_url: targetUrl })
        .expect(200);

      const expected = {
        ...mixedData,
        ...resetMetrics,
        eco_index_target_url: targetUrl,
        rgpd_dpo_name: "DPO conservé",
      };
      expect(response.body).toMatchObject(expected);
      expect(await readCompliance()).toMatchObject(expected);
    },
  );

  it.each([{}, { eco_index_target_url: oldUrl }])(
    "preserves existing metrics when PATCH URL is absent or unchanged: %p",
    async (urlData) => {
      await request(app().getHttpServer())
        .patch(`/applications/${applicationId}/compliances`)
        .set("Authorization", `Bearer ${token}`)
        .send({ ...mixedData, ...urlData })
        .expect(200);

      expect(await readCompliance()).toMatchObject({
        ...mixedData,
        eco_index_target_url: oldUrl,
        eco_index_score: 75,
        eco_index_ges: 1.5,
        eco_index_water: 2,
        eco_index_last_calculated_at: calculatedAt,
      });
    },
  );

  it.each([true, false])(
    "persists an Excel import with mixed compliance fields (URL supplied: %p)",
    async (withUrl) => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(sheetLabels.Compliances);
      sheet.addRow([
        "ID Application",
        "DSFR Implémenté",
        "DIMA Durée (heures)",
        "RGPD AIPD",
        ...(withUrl ? ["EcoIndex URL cible"] : []),
      ]);
      sheet.addRow([
        applicationId,
        "Oui",
        4,
        "Non",
        ...(withUrl ? [newUrl] : []),
      ]);
      const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

      const response = await request(app().getHttpServer())
        .post("/import/excel")
        .set("Authorization", `Bearer ${token}`)
        .attach("file", buffer, "compliances.xlsx")
        .expect(201);

      expect(response.body.summary).toMatchObject({
        updated: 1,
        created: 0,
        errors: 0,
      });
      expect(await readCompliance()).toMatchObject({
        ...mixedData,
        rgpd_dpo_name: "DPO conservé",
        eco_index_target_url: withUrl ? newUrl : oldUrl,
        ...(withUrl
          ? resetMetrics
          : {
              eco_index_score: 75,
              eco_index_ges: 1.5,
              eco_index_water: 2,
              eco_index_last_calculated_at: calculatedAt,
            }),
      });
    },
  );
});
