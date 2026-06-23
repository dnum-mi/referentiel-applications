import ExcelJS from "exceljs";

/** Type MIME d'un classeur Excel (.xlsx). */
export const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * Construit un classeur Excel à un onglet, à partir d'en-têtes et de lignes brutes.
 * Les en-têtes doivent reproduire les libellés de colonnes de l'export RefApp (le service
 * d'import retrouve les colonnes par ces libellés).
 */
export async function buildSheetWorkbook(
  sheetName: string,
  headers: string[],
  rows: (string | number)[][],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.addRow(headers);
  for (const row of rows) sheet.addRow(row);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
