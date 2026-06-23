// Neutralise une dépendance circulaire préexistante du graphe d'import
// (base.service <-> metadatas.service) qui casse à l'évaluation sous ts-jest.
jest.mock("src/metadatas/metadatas.service", () => ({
  MetadatasService: class {},
}));

import * as ExcelJS from "exceljs";
import { sheetLabels } from "src/applications/constants/application-export.sheet-labels";
import type { ActorsSheetProcessor } from "./processors/actors-sheet.processor";
import type { CompliancesSheetProcessor } from "./processors/compliances-sheet.processor";
import { ExcelImportService } from "./excel-import.service";

async function workbookBuffer(sheetNames: string[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  for (const name of sheetNames) wb.addWorksheet(name);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

function setup() {
  const actorsProcessor = {
    sheetName: sheetLabels.Actors,
    process: jest.fn().mockResolvedValue(undefined),
  };
  const compliancesProcessor = {
    sheetName: sheetLabels.Compliances,
    process: jest.fn().mockResolvedValue(undefined),
  };
  const service = new ExcelImportService(
    actorsProcessor as unknown as ActorsSheetProcessor,
    compliancesProcessor as unknown as CompliancesSheetProcessor,
  );
  return { service, actorsProcessor, compliancesProcessor };
}

describe("ExcelImportService", () => {
  it("délègue aux processeurs des onglets présents et ignore les inconnus", async () => {
    const { service, actorsProcessor, compliancesProcessor } = setup();
    const buffer = await workbookBuffer([
      sheetLabels.Actors,
      sheetLabels.Compliances,
      "Feuille inconnue",
    ]);

    const report = await service.importFromExcel(buffer, "user-1");

    expect(actorsProcessor.process).toHaveBeenCalledTimes(1);
    expect(compliancesProcessor.process).toHaveBeenCalledTimes(1);
    expect(report.summary.ignoredSheets).toContain("Feuille inconnue");
    expect(report.summary.ignoredSheets).not.toContain(sheetLabels.Actors);
  });

  it("ignore les onglets pris en charge mais absents", async () => {
    const { service, actorsProcessor, compliancesProcessor } = setup();
    const buffer = await workbookBuffer(["Autre"]);

    const report = await service.importFromExcel(buffer, "user-1");

    expect(actorsProcessor.process).not.toHaveBeenCalled();
    expect(compliancesProcessor.process).not.toHaveBeenCalled();
    expect(report.summary.ignoredSheets).toEqual(
      expect.arrayContaining([
        sheetLabels.Actors,
        sheetLabels.Compliances,
        "Autre",
      ]),
    );
  });

  it("rejette un fichier non Excel", async () => {
    const { service } = setup();
    await expect(
      service.importFromExcel(Buffer.from("pas un xlsx"), "user-1"),
    ).rejects.toThrow(/Excel/i);
  });
});
