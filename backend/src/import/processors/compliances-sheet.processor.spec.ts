// Neutralise une dépendance circulaire préexistante du graphe d'import
// (base.service <-> metadatas.service) qui casse à l'évaluation sous ts-jest.
jest.mock("src/metadatas/metadatas.service", () => ({
  MetadatasService: class {},
}));

import * as ExcelJS from "exceljs";
import { sheetLabels } from "src/applications/constants/application-export.sheet-labels";
import type { CompliancesService } from "src/compliances/compliances.service";
import type { PrismaService } from "src/prisma/prisma.service";
import { createEmptyReport } from "../dto/import-report.dto";
import { CompliancesSheetProcessor } from "./compliances-sheet.processor";

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
  const processor = new CompliancesSheetProcessor(
    prisma as unknown as PrismaService,
    compliancesService as unknown as CompliancesService,
  );
  return { processor, prisma, compliancesService };
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
        [["app-1", 5, "Oui", "Non"]],
      ),
      "user-1",
      report,
    );

    expect(report.summary.created).toBe(1);
    expect(report.summary.errors).toBe(0);
    expect(
      compliancesService.createOrUpdateByApplicationId,
    ).toHaveBeenCalledWith(
      "app-1",
      expect.objectContaining({
        dima_duration_hours: 5,
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
      "user-1",
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
      "user-1",
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
      "user-1",
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
      "user-1",
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
      "user-1",
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
      "user-1",
      report,
    );
    expect(report.summary.processedSheets).not.toContain(
      sheetLabels.Compliances,
    );
    expect(report.logs.join(" ")).toMatch(/colonnes manquantes/i);
  });
});
