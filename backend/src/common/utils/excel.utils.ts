export function ensureSheetHasAtLeastOneRow<T>(rows: T[], emptyRow: T): T[] {
  return rows.length > 0 ? rows : [emptyRow];
}
