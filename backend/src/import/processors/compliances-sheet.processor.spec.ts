// Neutralise une dépendance circulaire préexistante du graphe d'import
// (base.service <-> metadatas.service) qui casse à l'évaluation sous ts-jest.
jest.mock("src/metadatas/metadatas.service", () => ({
  MetadatasService: class {},
}));

import * as ExcelJS from "exceljs";
import { sheetLabels } from "src/applications/constants/application-export.sheet-labels";
import type { CheckPermissions } from "src/common/service/check-permissions.service";
import type { CompliancesService } from "src/compliances/compliances.service";
import type { PrismaService } from "src/prisma/prisma.service";
import type { Requestor } from "src/user/entities/user.entity";
import { createEmptyReport } from "../dto/import-report.dto";
import { CompliancesSheetProcessor } from "./compliances-sheet.processor";

const requestor = { id: "user-1" } as unknown as Requestor;

function buildSheet(
  headers: string[],
  rows: (string | number)[][],
): ExcelJS.Worksheet {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet(sheetLabels.Compliances);
  sheet.addRow(headers);
  for (const r of rows) sheet.addRow(r);
  return sheet;
}

function setup() {
  const prisma = {
    application: { findUnique: jest.fn().mockResolvedValue({ id: "app-1" }) },
  };
  const compliancesService = {
    findByApplicationId: jest.fn().mockResolvedValue(null),
    createOrUpdateByApplicationId: jest.fn().mockResolvedValue({ id: "c-1" }),
  };
  const checkPermissions = { can: jest.fn().mockResolvedValue(true) };
  const processor = new CompliancesSheetProcessor(
    prisma as unknown as PrismaService,
    compliancesService as unknown as CompliancesService,
    checkPermissions as unknown as CheckPermissions,
  );
  return { processor, prisma, compliancesService, checkPermissions };
}

describe("CompliancesSheetProcessor", () => {
  it("crée une conformité (aucune existante) avec coercion des types", async () => {
    const { processor, compliancesService } = setup();
    const report = createEmptyReport();
    await processor.process(
      buildSheet(
        [
          "ID Application",
          "DIMA Durée (heures)",
          "DSFR Implémenté",
          "DIMA HNO",
        ],
        [["app-1", 4, "Oui", "Non"]],
      ),
      requestor,
      report,
    );

    expect(report.summary.created).toBe(1);
    expect(report.summary.errors).toBe(0);
    expect(
      compliancesService.createOrUpdateByApplicationId,
    ).toHaveBeenCalledWith(
      "app-1",
      expect.objectContaining({
        dima_duration_hours: 4,
        dsfr_implemented: true,
        dima_is_hno: false,
      }),
      expect.objectContaining({ applicationId: "app-1" }),
    );
  });

  it("met à jour une conformité existante", async () => {
    const { processor, compliancesService } = setup();
    compliancesService.findByApplicationId.mockResolvedValue({ id: "c-1" });
    const report = createEmptyReport();
    await processor.process(
      buildSheet(["ID Application", "DIMA Impact métier"], [["app-1", "X"]]),
      requestor,
      report,
    );
    expect(report.summary.updated).toBe(1);
    expect(report.entries[0].status).toBe("updated");
  });

  it("erreur si l'application est introuvable", async () => {
    const { processor, prisma } = setup();
    prisma.application.findUnique.mockResolvedValue(null);
    const report = createEmptyReport();
    await processor.process(
      buildSheet(["ID Application", "DIMA Impact métier"], [["ghost", "X"]]),
      requestor,
      report,
    );
    expect(report.summary.errors).toBe(1);
    expect(report.entries[0].message).toMatch(/Application introuvable/i);
  });

  it("erreur de validation pour une valeur d'enum invalide", async () => {
    const { processor, compliancesService } = setup();
    const report = createEmptyReport();
    await processor.process(
      buildSheet(
        ["ID Application", "DIMA Résultat test"],
        [["app-1", "PEUT_ETRE"]],
      ),
      requestor,
      report,
    );
    expect(report.summary.errors).toBe(1);
    expect(report.entries[0].message).toMatch(/Validation/i);
    expect(
      compliancesService.createOrUpdateByApplicationId,
    ).not.toHaveBeenCalled();
  });

  it("erreur si la colonne ID Application est vide", async () => {
    const { processor } = setup();
    const report = createEmptyReport();
    await processor.process(
      buildSheet(["ID Application", "DIMA Impact métier"], [["", "X"]]),
      requestor,
      report,
    );
    expect(report.summary.errors).toBe(1);
    expect(report.entries[0].message).toMatch(/ID Application/i);
  });

  it("ignore les lignes entièrement vides", async () => {
    const { processor } = setup();
    const report = createEmptyReport();
    await processor.process(
      buildSheet(
        ["ID Application", "DIMA Impact métier"],
        [
          ["", ""],
          ["app-1", "X"],
        ],
      ),
      requestor,
      report,
    );
    expect(report.entries).toHaveLength(1);
    expect(report.summary.created).toBe(1);
  });

  it("ne traite pas l'onglet sans la colonne ID Application", async () => {
    const { processor } = setup();
    const report = createEmptyReport();
    await processor.process(
      buildSheet(["DIMA Impact métier"], [["X"]]),
      requestor,
      report,
    );
    expect(report.summary.processedSheets).not.toContain(
      sheetLabels.Compliances,
    );
    expect(report.logs.join(" ")).toMatch(/colonnes manquantes/i);
  });

  it("refuse la ligne et consigne le motif sans droits ComplianceWrite sur l'application", async () => {
    const { processor, checkPermissions, compliancesService } = setup();
    checkPermissions.can.mockResolvedValue(false);
    const report = createEmptyReport();
    await processor.process(
      buildSheet(["ID Application", "DIMA Impact métier"], [["app-1", "X"]]),
      requestor,
      report,
    );
    expect(report.summary.errors).toBe(1);
    expect(report.entries[0].message).toMatch(
      /Droits insuffisants.*ComplianceWrite/i,
    );
    expect(
      compliancesService.createOrUpdateByApplicationId,
    ).not.toHaveBeenCalled();
  });
});
