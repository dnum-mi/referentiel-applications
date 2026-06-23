import { Injectable } from "@nestjs/common";
import * as ExcelJS from "exceljs";
import { createEmptyReport, ImportReportDto } from "./dto/import-report.dto";
import { ActorsSheetProcessor } from "./processors/actors-sheet.processor";
import { ApplicationsSheetProcessor } from "./processors/applications-sheet.processor";
import { CompliancesSheetProcessor } from "./processors/compliances-sheet.processor";
import { HostingsSheetProcessor } from "./processors/hostings-sheet.processor";

@Injectable()
export class ExcelImportService {
  constructor(
    private readonly applicationsProcessor: ApplicationsSheetProcessor,
    private readonly hostingsProcessor: HostingsSheetProcessor,
    private readonly actorsProcessor: ActorsSheetProcessor,
    private readonly compliancesProcessor: CompliancesSheetProcessor,
  ) {}

  async importFromExcel(
    buffer: Buffer,
    requestorId: string,
  ): Promise<ImportReportDto> {
    const workbook = new ExcelJS.Workbook();
    try {
      // exceljs déclare son propre `interface Buffer extends ArrayBuffer`,
      // incompatible avec le Buffer générique de Node bien que correct au runtime.
      await workbook.xlsx.load(
        buffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
      );
    } catch {
      throw new Error("Le fichier fourni n'est pas un classeur Excel valide.");
    }

    const report = createEmptyReport();

    // Onglets pris en charge, dans l'ordre de traitement.
    // L'onglet « Applications » est toujours traité en premier (les autres s'y rattachent).
    const processors = [
      this.applicationsProcessor,
      this.hostingsProcessor,
      this.actorsProcessor,
      this.compliancesProcessor,
    ];
    const knownSheets = new Set(processors.map((p) => p.sheetName));

    for (const processor of processors) {
      const worksheet = workbook.getWorksheet(processor.sheetName);
      if (!worksheet) {
        report.summary.ignoredSheets.push(processor.sheetName);
        report.logs.push(`Onglet « ${processor.sheetName} » absent : ignoré.`);
        continue;
      }
      await processor.process(worksheet, requestorId, report);
    }

    // Onglets non reconnus présents dans le fichier : ignorés.
    for (const sheet of workbook.worksheets) {
      if (
        !knownSheets.has(sheet.name) &&
        !report.summary.ignoredSheets.includes(sheet.name)
      ) {
        report.summary.ignoredSheets.push(sheet.name);
      }
    }

    return report;
  }
}
