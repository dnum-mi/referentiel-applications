import type { Prisma } from "@prisma/client";

/**
 * Champs de la fiche conformité dont la présence fait considérer le PDMA / le DIMA
 * comme "renseigné". Source unique utilisée à la fois par le calcul de l'indice de
 * qualité (IQ), le résumé qualité affiché à l'utilisateur, et le filtre de recherche
 * par conformité — pour éviter que ces trois endroits ne divergent silencieusement.
 */
export const PDMA_FILLED_FIELDS = [
  "pdma_duration_hours",
  "pdma_data_types",
  "pdma_backup_frequency",
] as const;

export const DIMA_FILLED_FIELDS = [
  "dima_duration_hours",
  "dima_business_impact",
  "dima_recovery_plan",
] as const;

type ComplianceLike = Partial<
  Record<
    (typeof PDMA_FILLED_FIELDS)[number] | (typeof DIMA_FILLED_FIELDS)[number],
    unknown
  >
>;

export function isPdmaFilled(
  compliance: ComplianceLike | null | undefined,
): boolean {
  return PDMA_FILLED_FIELDS.some((field) => Boolean(compliance?.[field]));
}

export function isDimaFilled(
  compliance: ComplianceLike | null | undefined,
): boolean {
  return DIMA_FILLED_FIELDS.some((field) => Boolean(compliance?.[field]));
}

/** Clause Prisma : au moins un des champs PDMA ci-dessus est renseigné. */
export function pdmaFilledWhereClause(): Prisma.ComplianceWhereInput {
  return {
    OR: PDMA_FILLED_FIELDS.map((field) => ({ [field]: { not: null } })),
  };
}

/** Clause Prisma : au moins un des champs DIMA ci-dessus est renseigné. */
export function dimaFilledWhereClause(): Prisma.ComplianceWhereInput {
  return {
    OR: DIMA_FILLED_FIELDS.map((field) => ({ [field]: { not: null } })),
  };
}
