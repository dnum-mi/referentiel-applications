export const MIN_COLUMN_WIDTH = 60;
export const MAX_COLUMN_WIDTH = 2000;
export const DEFAULT_COLUMN_WIDTH = 200;

/** Les préférences et les contrôles de largeur utilisent une valeur CSS en pixels. */
export function normalizeColumnWidth(value: unknown): number | undefined {
  if (typeof value !== "number" && (typeof value !== "string" || !/^\d+(?:\.\d+)?(?:px)?$/.test(value.trim()))) {
    return undefined;
  }
  const width = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(width) || width <= 0) return undefined;
  return Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, Math.round(width)));
}
