import { Injectable } from "@nestjs/common";
import * as ExcelJS from "exceljs";
import { exportCellText, safeExportLink } from "src/utils/export.util";

export interface ExcelSheetConfig {
  name: string;
  columns: { header: string; key: string; width?: number }[];
  rows: Record<string, unknown>[];
}

@Injectable()
export class ExcelBuilderService {
  async buildWorkbook(sheets: ExcelSheetConfig[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Référentiel des applications";
    workbook.lastModifiedBy = workbook.creator;
    workbook.title = "Export des applications";
    workbook.subject = "Applications et données associées du périmètre exporté";
    // ExcelJS expose language dans son modèle OOXML, mais pas dans les
    // propriétés TypeScript directes du Workbook en version 4.4.
    workbook.model = { ...workbook.model, language: "fr-FR" };

    for (const [index, { name, columns, rows }] of sheets.entries()) {
      const sheet = workbook.addWorksheet(name);
      sheet.columns = columns;
      sheet.addTable({
        name: `RefAppTable${index + 1}`,
        ref: "A1",
        headerRow: true,
        totalsRow: false,
        style: { theme: "TableStyleMedium2", showRowStripes: false },
        columns: columns.map(({ header }) => ({
          name: header,
          filterButton: true,
        })),
        rows: rows.map((row) =>
          columns.map(({ key }) => {
            const value = row[key];
            const text = exportCellText(value);
            const hyperlink =
              key === "logo" || key === "externalRessource.link"
                ? safeExportLink(text)
                : undefined;
            if (hyperlink) return { text, hyperlink };
            if (value === null || value === undefined) return null;
            if (
              typeof value === "string" ||
              typeof value === "number" ||
              typeof value === "boolean" ||
              value instanceof Date
            )
              return value;
            return text;
          }),
        ),
      });

      sheet.views = [{ state: "frozen", ySplit: 1 }];
      sheet.eachRow((row, rowIndex) =>
        row.eachCell((cell) => {
          cell.font = { name: "Arial", size: 12, color: { argb: "FF161616" } };
          cell.alignment = { vertical: "top", wrapText: true };
          if (cell.type === ExcelJS.ValueType.Hyperlink) {
            cell.font = {
              ...cell.font,
              underline: true,
              color: { argb: "FF000091" },
            };
          }
          if (rowIndex === 1) {
            cell.font = {
              name: "Arial",
              size: 12,
              bold: true,
              color: { argb: "FFFFFFFF" },
            };
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FF000091" },
            };
          }
        }),
      );

      const hasApplicationId = columns.some(
        (col) => col.key === "id" || col.key === "applicationId",
      );

      if (hasApplicationId) {
        this.applyApplicationRowColors(sheet);
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private stringifyCellValue(value: ExcelJS.CellValue): string | undefined {
    if (value === null || value === undefined) return undefined;
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  }

  private applyApplicationRowColors(sheet: ExcelJS.Worksheet) {
    const headerRow = sheet.getRow(1);
    const headerValues = (headerRow.values as ExcelJS.CellValue[]).filter(
      Boolean,
    );

    const appIdKeys = new Set([
      "applicationId",
      "id",
      "Application",
      "ID Application",
    ]);
    const appIdColIndex = headerValues.findIndex(
      (val) => typeof val === "string" && appIdKeys.has(val),
    );

    if (appIdColIndex === -1) return;

    const columnIndex = appIdColIndex + 1;

    let currentAppId: string | undefined;
    let colorIndex = 0;
    const colors = ["FFCCE5FF", "FFE6CCFF"];

    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const appId = this.stringifyCellValue(row.getCell(columnIndex).value);

      if (appId && appId !== currentAppId) {
        currentAppId = appId;
        colorIndex = (colorIndex + 1) % colors.length;
      }

      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: colors[colorIndex] },
        };
      });
    }
  }
}
