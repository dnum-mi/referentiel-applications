/** Une URL utilisateur reste du texte si son protocole ne convient pas. */
export function safeExportLink(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") return url.href;
  } catch {
    // Les chemins relatifs et les valeurs non URL restent lisibles.
  }
  return undefined;
}

export function exportCellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}
