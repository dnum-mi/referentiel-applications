import { Injectable } from "@nestjs/common";
import * as ExcelJS from "exceljs";

export interface ExcelSheetConfig {
  name: string;
  columns: { header: string; key: string; width?: number }[];
  rows: Record<string, any>[];
}

@Injectable()
export class ExcelBuilderService {
  async buildWorkbook(sheets: ExcelSheetConfig[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    for (const { name, columns, rows } of sheets) {
      const sheet = workbook.addWorksheet(name);
      sheet.columns = columns;
      rows.forEach((row) => sheet.addRow(row));

      sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: columns.length },
      };

      sheet.views = [{ state: "frozen", ySplit: 1 }];

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

  private applyApplicationRowColors(sheet: ExcelJS.Worksheet) {
    const headerRow = sheet.getRow(1);
    const headerValues = (headerRow.values as ExcelJS.CellValue[]).filter(
      Boolean,
    );

    const appIdKeys = ["applicationId", "id", "Application", "ID Application"];
    const appIdColIndex = headerValues.findIndex(
      (val) => typeof val === "string" && appIdKeys.includes(val),
    );

    if (appIdColIndex === -1) return;

    const columnIndex = appIdColIndex + 1;

    let currentAppId: string | undefined;
    let colorIndex = 0;
    const colors = ["FFCCE5FF", "FFE6CCFF"];

    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const appId = row.getCell(columnIndex).value?.toString();

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
