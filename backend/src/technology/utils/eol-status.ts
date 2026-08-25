import { Prisma } from "@prisma/client";

/**
 * Fin de vie « proche » : dans moins de 6 mois (182 jours).
 *
 * Le même seuil qu'à l'affichage de l'onglet Stack technique — la vue transverse
 * et la fiche doivent classer une technologie de la même façon, sinon un badge
 * « fin de vie proche » sur une fiche correspondrait à une application absente de
 * la liste transverse.
 */
export const EOL_SOON_MS = 182 * 24 * 60 * 60 * 1000;

/**
 * Durée de validité d'une résolution endoflife.date : au-delà, la ligne est
 * recalculée. Partagée entre la lecture paresseuse d'une fiche et le recalcul
 * planifié, pour que les deux s'accordent sur ce qu'est une donnée périmée.
 */
export const EOL_REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Statut de fin de vie d'une ligne de stack technique, par gravité décroissante :
 * - `eol` : la fin de vie est dépassée ;
 * - `eol-soon` : elle survient dans moins de 6 mois ;
 * - `eoas-passed` : la fin de vie n'est ni dépassée ni proche, mais le support
 *   ACTIF l'est — le produit ne reçoit plus que des correctifs de sécurité.
 */
export type EolStatus = "eol" | "eol-soon" | "eoas-passed";

export const EOL_STATUSES: readonly EolStatus[] = [
  "eol",
  "eol-soon",
  "eoas-passed",
];

/**
 * Classe une ligne à partir de ses deux dates, en cascade : le premier statut qui
 * s'applique gagne. Une technologie déjà en fin de vie n'est donc jamais
 * rétrogradée en « fin de support actif », même si les deux dates sont passées.
 */
export function computeEolStatus(
  row: { eolDate?: Date | null; eoasDate?: Date | null },
  now: Date = new Date(),
): EolStatus | null {
  const time = now.getTime();
  const eol = row.eolDate ? new Date(row.eolDate).getTime() : null;
  const eoas = row.eoasDate ? new Date(row.eoasDate).getTime() : null;
  if (eol !== null && eol < time) return "eol";
  if (eol !== null && eol < time + EOL_SOON_MS) return "eol-soon";
  if (eoas !== null && eoas < time) return "eoas-passed";
  return null;
}

/**
 * Traduit un statut en filtre Prisma sur `TechnologyStack`.
 *
 * Les conditions sont **mutuellement exclusives**, à l'image de la cascade de
 * `computeEolStatus` : sans cela, filtrer sur « fin de support actif » ramènerait
 * aussi les technologies déjà en fin de vie, et les trois filtres se
 * chevaucheraient au lieu de partitionner la liste.
 *
 * Sans statut demandé, on retient toute ligne qui porte au moins un des trois —
 * `eolDate < soon` couvre à la fois `eol` et `eol-soon`.
 */
export function eolStatusWhere(
  status: EolStatus | undefined,
  now: Date = new Date(),
): Prisma.TechnologyStackWhereInput {
  const soon = new Date(now.getTime() + EOL_SOON_MS);
  switch (status) {
    case "eol":
      return { eolDate: { lt: now } };
    case "eol-soon":
      return { eolDate: { gte: now, lt: soon } };
    case "eoas-passed":
      return {
        eoasDate: { lt: now },
        OR: [{ eolDate: null }, { eolDate: { gte: soon } }],
      };
    default:
      return {
        OR: [{ eolDate: { lt: soon } }, { eoasDate: { lt: now } }],
      };
  }
}
