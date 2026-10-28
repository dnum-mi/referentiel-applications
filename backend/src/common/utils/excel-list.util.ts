/** Marqueur visible et versionné : les en-têtes historiques restent non ambigus. */
export function jsonListHeader(header: string): string {
  return `${header} [liste JSON v1]`;
}

export function serializeExcelList(values: readonly string[] = []): string {
  return JSON.stringify(values);
}

/**
 * Le format JSON est explicite dans l'en-tête, jamais déduit du contenu : un
 * ancien libellé qui ressemble à du JSON garde son interprétation historique.
 */
export function parseExcelList(
  value: string,
  jsonEncoded: boolean,
  header: string,
): string[] {
  if (!jsonEncoded) {
    return value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(
      `La colonne « ${header} » attend une liste JSON de chaînes valide.`,
    );
  }
  if (
    !Array.isArray(parsed) ||
    !parsed.every((item) => typeof item === "string")
  ) {
    throw new Error(
      `La colonne « ${header} » attend une liste JSON de chaînes valide.`,
    );
  }
  return parsed;
}
