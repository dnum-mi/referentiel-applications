type DateLike = string | Date | null | undefined;

/** Fin de vie « proche » : dans moins de 6 mois (même seuil que le backend, eol-status.ts). */
export const EOL_SOON_MS = 182 * 24 * 60 * 60 * 1000;

export type EolStatus = "eol" | "eol-soon" | "eoas-passed";

/** Libellés uniques des statuts (#2528) : fiche, vue transverse et pastille de synthèse. */
export const EOL_STATUS_LABELS: Record<EolStatus, string> = {
  eol: "Fin de vie",
  "eol-soon": "Fin de vie proche",
  "eoas-passed": "Fin de support actif",
};

export const EOL_STATUS_BADGE_TYPE: Record<EolStatus, "error" | "warning" | "info"> = {
  eol: "error",
  "eol-soon": "warning",
  "eoas-passed": "info",
};

/** Statut d'une ligne à partir de ses dates, dans l'ordre de gravité (identique au backend). */
export function computeEolStatus(techno: { eolDate?: DateLike; eoasDate?: DateLike }, now: number = Date.now()): EolStatus | null {
  const eol = techno.eolDate ? new Date(techno.eolDate).getTime() : null;
  const eoas = techno.eoasDate ? new Date(techno.eoasDate).getTime() : null;
  if (eol !== null && eol < now) return "eol";
  if (eol !== null && eol < now + EOL_SOON_MS) return "eol-soon";
  if (eoas !== null && eoas < now) return "eoas-passed";
  return null;
}

/**
 * Page endoflife.date du produit résolu (#2528). Le slug persisté est celui de l'API
 * (`[a-z0-9-]`) ; toute autre valeur ne donne aucun lien plutôt qu'une URL douteuse.
 */
export function endoflifeProductUrl(slug: string | null | undefined): string | null {
  return slug && /^[a-z0-9-]+$/.test(slug) ? `https://endoflife.date/${slug}` : null;
}
