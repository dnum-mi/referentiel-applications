import type { UserFakerReturnType } from "./fakers/user.faker";
import { randomUUID } from "node:crypto";
import { MetadataAction, Permission, Roles } from "@prisma/client";
import * as ExcelJS from "exceljs";
import request from "supertest";
import { ApplicationExportService } from "src/applications/export.service";
import { ApplicationProductExportService } from "src/applications/product-export.service";
import * as betaRegistry from "src/features/beta-features";
import { FeatureId } from "src/features/beta-features";
import { ApplicationFaker } from "./fakers/application.faker";
import { OrganizationFaker } from "./fakers/organization.faker";
import { getPrismaClient } from "./fakers/prisma";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

describe("Fonctionnalités bêta — capacité explicite et droits métier (#3033)", () => {
  const app = setupTestSuite();
  const prisma = getPrismaClient();
  const prefix = `beta-features-${randomUUID()}`;
  let admin: UserFakerReturnType;
  let dataExporter: UserFakerReturnType;
  let betaVisitor: UserFakerReturnType;
  let scopedAdmin: UserFakerReturnType;
  let scopedTarget: UserFakerReturnType;
  let applicationId: string;

  const routes = [
    { featureId: FeatureId.CatalogueExcelExport, kind: "excel" },
    { featureId: FeatureId.ProductHtmlExport, kind: "html" },
    { featureId: FeatureId.ProductPowerpointExport, kind: "powerpoint" },
  ] as const;

  function exportRequest(kind: (typeof routes)[number]["kind"], token: string) {
    const server = request(app().getHttpServer());
    return kind === "excel"
      ? server
          .get("/applications/export/excel")
          .query({ label: prefix })
          .set("Authorization", `Bearer ${token}`)
      : server
          .post(`/applications/${applicationId}/export/${kind}`)
          .set("Authorization", `Bearer ${token}`);
  }

  async function expectNoExport(
    user: UserFakerReturnType,
    kinds: readonly (typeof routes)[number]["kind"][],
    token = getToken(user),
  ) {
    const catalogue = jest.spyOn(
      app().get(ApplicationExportService),
      "exportSearchResultsToExcel",
    );
    const html = jest.spyOn(
      app().get(ApplicationProductExportService),
      "exportProductCardToHtml",
    );
    const powerpoint = jest.spyOn(
      app().get(ApplicationProductExportService),
      "exportProductCard",
    );
    const before = await prisma.metadata.count({
      where: { createdById: user.id, action: MetadataAction.export },
    });
    try {
      for (const kind of kinds) {
        await exportRequest(kind, token).expect(403);
      }
      expect(catalogue).not.toHaveBeenCalled();
      expect(html).not.toHaveBeenCalled();
      expect(powerpoint).not.toHaveBeenCalled();
      expect(
        await prisma.metadata.count({
          where: { createdById: user.id, action: MetadataAction.export },
        }),
      ).toBe(before);
    } finally {
      catalogue.mockRestore();
      html.mockRestore();
      powerpoint.mockRestore();
    }
  }

  beforeAll(async () => {
    // Aucun faker partagé ni rôle ne reçoit implicitement la capacité bêta.
    admin = await UserFaker.create({ role: Roles.ADMIN });
    dataExporter = await UserFaker.create({
      role: Roles.READER,
      additionalPermissions: [Permission.DataExport],
    });
    betaVisitor = await UserFaker.create({
      role: Roles.VISITOR,
      additionalPermissions: [Permission.BetaFeatures],
    });
    const application = await ApplicationFaker.create(admin);
    applicationId = application.id;
    await prisma.application.update({
      where: { id: applicationId },
      data: { label: prefix },
    });

    const scope = await OrganizationFaker.create({ path: `/${prefix}/AUDIT` });
    const child = await OrganizationFaker.create({
      path: `/${prefix}/AUDIT/TEAM`,
    });
    scopedAdmin = await UserFaker.create({ role: Roles.ADMIN });
    await scopedAdmin.update({
      organization: { connect: { id: scope.id } },
      scopeOrganization: { connect: { id: scope.id } },
    });
    scopedTarget = await UserFaker.create({ role: Roles.READER });
    await scopedTarget.update({ organization: { connect: { id: child.id } } });
  });

  it("publie le registre des trois fonctionnalités dans la configuration publique", async () => {
    const response = await request(app().getHttpServer())
      .get("/config")
      .expect(200);
    expect(response.body.betaFeatures).toEqual([
      FeatureId.CatalogueExcelExport,
      FeatureId.ProductHtmlExport,
      FeatureId.ProductPowerpointExport,
    ]);
  });

  it.each(Object.values(Roles))(
    "le rôle %s ne reçoit pas BetaFeatures par défaut",
    async (role) => {
      const user = await UserFaker.create({ role });
      const response = await request(app().getHttpServer())
        .get("/users/me")
        .set("Authorization", `Bearer ${getToken(user)}`)
        .expect(200);
      expect(response.body.permissions).not.toContain(Permission.BetaFeatures);
      expect(response.body.additionalPermissions).not.toContain(
        Permission.BetaFeatures,
      );
    },
  );

  it.each(routes)(
    "l'administrateur sans capacité bêta ne peut télécharger $featureId",
    async ({ kind, featureId }) => {
      const response = await exportRequest(kind, getToken(admin)).expect(403);
      expect(response.body).toMatchObject({
        betaFeatureRequired: true,
        featureId,
      });
    },
  );

  it("DataExport seul ne permet aucun des trois exports en bêta", async () => {
    await expectNoExport(dataExporter, ["excel", "html", "powerpoint"]);
  });

  it("BetaFeatures seul ne remplace pas le droit métier DataExport du catalogue", async () => {
    await expectNoExport(betaVisitor, ["excel"]);
  });

  it("l'export HTML stable du catalogue reste accessible avec DataExport sans capacité bêta", async () => {
    const response = await request(app().getHttpServer())
      .get("/applications/export/html")
      .query({ label: prefix })
      .set("Authorization", `Bearer ${getToken(dataExporter)}`)
      .expect(200);
    expect(response.headers["content-type"]).toMatch(
      /^text\/html;\s*charset=utf-8$/i,
    );
    expect(response.headers["content-disposition"]).toBe(
      "attachment; filename=applications_export.html",
    );
    expect(response.text).toContain(prefix);
  });

  it("un administrateur global peut attribuer puis retirer la capacité, sans renouvellement du JWT", async () => {
    const target = await UserFaker.create({
      role: Roles.VISITOR,
      additionalPermissions: [Permission.DataExport],
    });
    const token = getToken(target);
    await expectNoExport(target, ["excel"], token);

    await request(app().getHttpServer())
      .patch(`/users/${target.id}`)
      .set("Authorization", `Bearer ${getToken(admin)}`)
      .send({
        additionalPermissions: [Permission.DataExport, Permission.BetaFeatures],
      })
      .expect(200);
    const permissionLog = await prisma.userPermissionLog.findFirstOrThrow({
      where: { userId: target.id },
      orderBy: { createdAt: "desc" },
    });
    expect(permissionLog.additionalPermissions).toContain(
      Permission.BetaFeatures,
    );
    expect(permissionLog.changedById).toBe(admin.id);

    const response = await exportRequest("excel", token)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(response.headers["content-type"]).toContain(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(response.body as ArrayBuffer);
    expect(workbook.worksheets[0].getRow(2).getCell(1).value).toBe(
      applicationId,
    );

    await request(app().getHttpServer())
      .patch(`/users/${target.id}`)
      .set("Authorization", `Bearer ${getToken(admin)}`)
      .send({ additionalPermissions: [Permission.DataExport] })
      .expect(200);
    const revoked = await prisma.user.findUniqueOrThrow({
      where: { id: target.id },
    });
    expect(revoked.additionalPermissions).toEqual([Permission.DataExport]);
    await expectNoExport(target, ["excel", "html", "powerpoint"], token);
  });

  it("le retrait en base s'applique au même JWT avant toute génération ou trace métier d'export", async () => {
    const token = getToken(betaVisitor);
    // AppRead appartient déjà au socle VISITOR : cette capacité métier reste
    // distincte de BetaFeatures et autorise les informations générales de la fiche.
    const response = await exportRequest("html", token).expect(200);
    expect(response.headers["content-type"]).toMatch(
      /^text\/html;\s*charset=utf-8$/i,
    );
    expect(response.text).toContain('<html lang="fr">');
    expect(response.text).toContain(prefix);

    await prisma.user.update({
      where: { id: betaVisitor.id },
      data: { additionalPermissions: [] },
    });
    await expectNoExport(betaVisitor, ["excel", "html", "powerpoint"], token);
  });

  it("un administrateur scopé ne peut déléguer BetaFeatures à une cible de son périmètre", async () => {
    await request(app().getHttpServer())
      .patch(`/users/${scopedTarget.id}`)
      .set("Authorization", `Bearer ${getToken(scopedAdmin)}`)
      .send({ additionalPermissions: [Permission.BetaFeatures] })
      .expect(403);
    const target = await prisma.user.findUniqueOrThrow({
      where: { id: scopedTarget.id },
    });
    expect(target.additionalPermissions).toEqual([]);
    expect(
      await prisma.userPermissionLog.count({
        where: { userId: scopedTarget.id },
      }),
    ).toBe(0);
  });

  it("un administrateur scopé ne peut s'accorder la capacité bêta", async () => {
    await request(app().getHttpServer())
      .patch(`/users/${scopedAdmin.id}`)
      .set("Authorization", `Bearer ${getToken(scopedAdmin)}`)
      .send({ additionalPermissions: [Permission.BetaFeatures] })
      .expect(403);
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: scopedAdmin.id },
    });
    expect(user.additionalPermissions).toEqual([]);
  });

  it("un utilisateur ordinaire ne peut s'accorder BetaFeatures par les routes utilisateur ou préférences", async () => {
    await request(app().getHttpServer())
      .patch(`/users/${dataExporter.id}`)
      .set("Authorization", `Bearer ${getToken(dataExporter)}`)
      .send({
        additionalPermissions: [Permission.DataExport, Permission.BetaFeatures],
      })
      .expect(403);
    await request(app().getHttpServer())
      .patch("/users/me")
      .set("Authorization", `Bearer ${getToken(dataExporter)}`)
      .send({
        additionalPermissions: [Permission.DataExport, Permission.BetaFeatures],
      })
      .expect(400);
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: dataExporter.id },
    });
    expect(user.additionalPermissions).toEqual([Permission.DataExport]);
  });

  it("une fonctionnalité sortie du registre bêta ne demande plus la capacité et les autres restent protégées", async () => {
    const registry = jest.replaceProperty(betaRegistry, "BETA_FEATURES", [
      FeatureId.CatalogueExcelExport,
      FeatureId.ProductPowerpointExport,
    ]);
    try {
      const configuration = await request(app().getHttpServer())
        .get("/config")
        .expect(200);
      expect(configuration.body.betaFeatures).toEqual([
        FeatureId.CatalogueExcelExport,
        FeatureId.ProductPowerpointExport,
      ]);
      const response = await exportRequest("html", getToken(admin)).expect(200);
      expect(response.text).toContain(prefix);
      await expectNoExport(admin, ["excel", "powerpoint"]);
    } finally {
      registry.restore();
    }
  });
});
