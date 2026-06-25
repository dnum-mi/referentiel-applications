// Neutralise une dépendance circulaire préexistante du graphe d'import
// (base.service <-> metadatas.service) qui casse à l'évaluation sous ts-jest.
jest.mock("src/metadatas/metadatas.service", () => ({
  MetadatasService: class {},
}));

import * as ExcelJS from "exceljs";
import type { ApplicationService } from "src/applications/application.service";
import { sheetLabels } from "src/applications/constants/application-export.sheet-labels";
import type { CheckPermissions } from "src/common/service/check-permissions.service";
import type { PrismaService } from "src/prisma/prisma.service";
import type { Requestor } from "src/user/entities/user.entity";
import { createEmptyReport } from "../dto/import-report.dto";
import { ApplicationsSheetProcessor } from "./applications-sheet.processor";

const requestor = { id: "user-1" } as unknown as Requestor;

function buildSheet(
  headers: string[],
  rows: (string | number)[][],
): ExcelJS.Worksheet {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet(sheetLabels.Applications);
  sheet.addRow(headers);
  for (const r of rows) sheet.addRow(r);
  return sheet;
}

function setup() {
  const prisma = {
    application: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        where.id === "ghost" ? null : { id: where.id },
      ),
    },
  };
  const applicationService = {
    createApplication: jest.fn().mockResolvedValue({ id: "new-app" }),
    update: jest.fn().mockResolvedValue({ id: "app-1" }),
  };
  const checkPermissions = { can: jest.fn().mockResolvedValue(true) };
  const processor = new ApplicationsSheetProcessor(
    prisma as unknown as PrismaService,
    applicationService as unknown as ApplicationService,
    checkPermissions as unknown as CheckPermissions,
  );
  return { processor, prisma, applicationService, checkPermissions };
}

describe("ApplicationsSheetProcessor", () => {
  it("crée une application sans identifiant", async () => {
    const { processor, applicationService } = setup();
    const report = createEmptyReport();
    await processor.process(
      buildSheet(
        ["Identifiant", "Libellé", "Description"],
        [["", "Nouvelle App", "Une description"]],
      ),
      requestor,
      report,
    );

    expect(report.summary.created).toBe(1);
    expect(report.summary.errors).toBe(0);
    expect(applicationService.createApplication).toHaveBeenCalledWith(
      "user-1",
      // `tags` doit être un tableau (défaut []) : `createApplication` le passe à `findByNames`.
      expect.objectContaining({ label: "Nouvelle App", tags: [] }),
    );
  });

  it("met à jour une application avec identifiant", async () => {
    const { processor, applicationService } = setup();
    const report = createEmptyReport();
    await processor.process(
      buildSheet(
        ["Identifiant", "Libellé", "Description"],
        [["app-1", "App MAJ", "Desc"]],
      ),
      requestor,
      report,
    );

    expect(report.summary.updated).toBe(1);
    expect(applicationService.update).toHaveBeenCalledWith(
      expect.objectContaining({ applicationId: "app-1" }),
    );
  });

  it("résout les listes (séparées par des virgules) et la priorité par libellé", async () => {
    const { processor, applicationService } = setup();
    const report = createEmptyReport();
    await processor.process(
      buildSheet(
        [
          "Identifiant",
          "Libellé",
          "Description",
          "Tags",
          "Priorité de redémarrage",
        ],
        [["", "App listes", "Desc", "a, b, c", "R0 - Immédiat (H24)"]],
      ),
      requestor,
      report,
    );

    expect(report.summary.created).toBe(1);
    expect(applicationService.createApplication).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        tags: ["a", "b", "c"],
        priorityRestart: "R0",
      }),
    );
  });

  it("consigne une erreur quand l'application à mettre à jour est introuvable", async () => {
    const { processor } = setup();
    const report = createEmptyReport();
    await processor.process(
      buildSheet(
        ["Identifiant", "Libellé", "Description"],
        [["ghost", "Fantôme", "Desc"]],
      ),
      requestor,
      report,
    );

    expect(report.summary.errors).toBe(1);
    expect(report.entries[0].message).toMatch(/Application introuvable/i);
  });

  it("erreur de validation si le libellé est trop court (création)", async () => {
    const { processor, applicationService } = setup();
    const report = createEmptyReport();
    await processor.process(
      buildSheet(
        ["Identifiant", "Libellé", "Description"],
        [["", "X", "Desc"]],
      ),
      requestor,
      report,
    );

    expect(report.summary.errors).toBe(1);
    expect(report.entries[0].message).toMatch(/Validation/i);
    expect(applicationService.createApplication).not.toHaveBeenCalled();
  });

  it("ne traite pas l'onglet sans la colonne Identifiant", async () => {
    const { processor } = setup();
    const report = createEmptyReport();
    await processor.process(
      buildSheet(["Libellé", "Description"], [["App", "Desc"]]),
      requestor,
      report,
    );

    expect(report.summary.processedSheets).not.toContain(
      sheetLabels.Applications,
    );
    expect(report.logs.join(" ")).toMatch(/colonnes manquantes/i);
  });

  it("refuse la création sans la permission globale CreateApplication", async () => {
    const { processor, checkPermissions, applicationService } = setup();
    checkPermissions.can.mockResolvedValue(false);
    const report = createEmptyReport();
    await processor.process(
      buildSheet(
        ["Identifiant", "Libellé", "Description"],
        [["", "Nouvelle App", "Desc"]],
      ),
      requestor,
      report,
    );

    expect(report.summary.errors).toBe(1);
    expect(report.entries[0].message).toMatch(
      /Droits insuffisants.*CreateApplication/i,
    );
    expect(applicationService.createApplication).not.toHaveBeenCalled();
  });

  it("refuse la mise à jour sans droits AppWrite sur l'application", async () => {
    const { processor, checkPermissions, applicationService } = setup();
    checkPermissions.can.mockResolvedValue(false);
    const report = createEmptyReport();
    await processor.process(
      buildSheet(
        ["Identifiant", "Libellé", "Description"],
        [["app-1", "App MAJ", "Desc"]],
      ),
      requestor,
      report,
    );

    expect(report.summary.errors).toBe(1);
    expect(report.entries[0].message).toMatch(/Droits insuffisants.*AppWrite/i);
    expect(applicationService.update).not.toHaveBeenCalled();
  });
});
