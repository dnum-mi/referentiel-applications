import * as ExcelJS from "exceljs";

/** Convertit une valeur de cellule exceljs en chaîne nettoyée (gère hyperliens, richText, formules). */
export function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const obj = value as {
      text?: string;
      hyperlink?: string;
      result?: unknown;
      richText?: { text: string }[];
    };
    if (typeof obj.text === "string") return obj.text.trim();
    if (Array.isArray(obj.richText)) {
      return obj.richText
        .map((part) => part.text)
        .join("")
        .trim();
    }
    if (obj.result !== undefined && obj.result !== null) {
      return String(obj.result).trim();
    }
  }
  return "";
}

/** Indexe la ligne d'en-tête : libellé de colonne → numéro de colonne (1-based). */
export function buildHeaderIndex(
  worksheet: ExcelJS.Worksheet,
): Record<string, number> {
  const headerRow = worksheet.getRow(1);
  const index: Record<string, number> = {};
  headerRow.eachCell((cell, colNumber) => {
    const label = cellToString(cell.value);
    if (label) index[label] = colNumber;
  });
  return index;
}

/** Lecteur de cellule par libellé de colonne pour une ligne donnée. */
export function makeCellReader(
  headerIndex: Record<string, number>,
  row: ExcelJS.Row,
): (header: string) => string {
  return (header: string) => {
    const col = headerIndex[header];
    if (!col) return "";
    return cellToString(row.getCell(col).value);
  };
}

/** « Oui »/« Non » (insensible à la casse) → booléen ; vide ou inconnu → undefined. */
export function coerceOuiNon(value: string): boolean | undefined {
  const normalized = value.trim().toLowerCase();
  if (normalized === "oui" || normalized === "true") return true;
  if (normalized === "non" || normalized === "false") return false;
  return undefined;
}

/** Chaîne numérique → nombre ; vide → undefined (NaN laissé pour échec de validation). */
export function coerceNumber(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  return Number(value);
}

/** Date (cellule déjà convertie en ISO par cellToString) → chaîne ISO ; vide → undefined. */
export function coerceDate(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  // Si ce n'est pas déjà une date ISO, tenter une conversion ; sinon laisser tel quel
  // pour que la validation @IsDateString rejette une valeur invalide.
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toISOString();
}

/**
 * Motif explicite consigné dans le rapport quand une ligne est refusée faute de droits
 * suffisants (US #1890). Reprend le nom de la permission exigée et, le cas échéant, l'application
 * concernée — pour distinguer un refus de droits d'une erreur générique.
 */
export function insufficientRightsMessage(
  permission: string,
  applicationId?: string,
): string {
  const scope = applicationId ? ` sur l'application ${applicationId}` : "";
  return `Droits insuffisants : permission « ${permission} » requise${scope}.`;
}
