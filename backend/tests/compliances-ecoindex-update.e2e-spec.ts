import { calculateEcoIndexMetricsFromUrl } from "src/compliances/utils/ecoindex.utils";
import { Roles } from "@prisma/client";
import * as ExcelJS from "exceljs";
import request from "supertest";
import { sheetLabels } from "src/applications/constants/application-export.sheet-labels";
import { ApplicationFaker } from "./fakers/application.faker";
import { getPrismaClient } from "./fakers/prisma";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

jest.mock("src/compliances/utils/ecoindex.utils", () => ({
  calculateEcoIndexMetricsFromUrl: jest.fn(),
}));

const conflictMessage =
  "La cible EcoIndex a été modifiée ou supprimée pendant le calcul. Résultat ignoré. Vérifiez l’URL actuelle puis relancez le calcul.";

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

  async function startScan() {
    let finish!: (
      metrics: Awaited<ReturnType<typeof calculateEcoIndexMetricsFromUrl>>,
    ) => void;
    let started!: () => void;
    const calculationStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    jest.mocked(calculateEcoIndexMetricsFromUrl).mockImplementationOnce(() => {
      started();
      return new Promise((resolve) => {
        finish = resolve;
      });
    });
    const response = request(app().getHttpServer())
      .post(`/applications/${applicationId}/compliances/ecoindex/scan`)
      .set("Authorization", `Bearer ${token}`)
      .send()
      .then((result) => result);
    await calculationStarted;
    return async (status: number) => {
      finish({ score: 90, ges: 1, water: 1.2, calculatedAt });
      const result = await response;
      expect(result.status).toBe(status);
      expect(result.body).not.toHaveProperty("eco_index_target_revision");
      if (status === 409) expect(result.body.message).toBe(conflictMessage);
      return result;
    };
  }

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

      const finishScan = await startScan();
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
        eco_index_target_revision: withUrl ? 1 : 0,
        ...(withUrl
          ? resetMetrics
          : {
              eco_index_score: 75,
              eco_index_ges: 1.5,
              eco_index_water: 2,
              eco_index_last_calculated_at: calculatedAt,
            }),
      });
      const beforeResult = await readCompliance();
      await finishScan(withUrl ? 409 : 200);
      expect(await readCompliance()).toMatchObject(
        withUrl ? beforeResult : { ...mixedData, eco_index_score: 90 },
      );
    },
  );

  it("keeps the revision internal and rejects attempts to set it", async () => {
    const response = await request(app().getHttpServer())
      .get(`/applications/${applicationId}/compliances`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(response.body).not.toHaveProperty("eco_index_target_revision");
    await request(app().getHttpServer())
      .patch(`/applications/${applicationId}/compliances`)
      .set("Authorization", `Bearer ${token}`)
      .send({ eco_index_target_revision: 42 })
      .expect(400);
    expect((await readCompliance()).eco_index_target_revision).toBe(0);
  });

  it.each([[newUrl], [newUrl, oldUrl], [null], [""]])(
    "rejects a suspended scan after target changes: %j",
    async (...urls) => {
      const finishScan = await startScan();
      for (const url of urls) {
        await request(app().getHttpServer())
          .patch(`/applications/${applicationId}/compliances`)
          .set("Authorization", `Bearer ${token}`)
          .send({ eco_index_target_url: url })
          .expect(200);
      }
      const beforeResult = await readCompliance();
      expect(beforeResult.eco_index_target_revision).toBe(urls.length);
      await finishScan(409);
      expect(await readCompliance()).toEqual(beforeResult);
      expect(await readCompliance()).toMatchObject(resetMetrics);
    },
  );

  it.each([false, true])(
    "does not restore a deleted compliance (recreated: %p)",
    async (recreate) => {
      const finishScan = await startScan();
      await getPrismaClient().compliance.delete({ where: { applicationId } });
      if (recreate)
        await getPrismaClient().compliance.create({
          data: { applicationId, eco_index_target_url: oldUrl },
        });
      const beforeResult = await getPrismaClient().compliance.findUnique({
        where: { applicationId },
      });
      await finishScan(409);
      expect(
        await getPrismaClient().compliance.findUnique({
          where: { applicationId },
        }),
      ).toEqual(beforeResult);
    },
  );

  it.each([{}, { eco_index_target_url: oldUrl }, mixedData])(
    "accepts an unchanged target and preserves other fields: %j",
    async (data) => {
      const finishScan = await startScan();
      const patched = await request(app().getHttpServer())
        .patch(`/applications/${applicationId}/compliances`)
        .set("Authorization", `Bearer ${token}`)
        .send(data)
        .expect(200);
      expect(patched.body).not.toHaveProperty("eco_index_target_revision");
      const beforeResult = await readCompliance();
      await finishScan(200);
      expect(await readCompliance()).toEqual({
        ...beforeResult,
        eco_index_score: 90,
        eco_index_ges: 1,
        eco_index_water: 1.2,
        eco_index_last_calculated_at: calculatedAt,
      });
      expect((await readCompliance()).eco_index_target_revision).toBe(0);
    },
  );
});
