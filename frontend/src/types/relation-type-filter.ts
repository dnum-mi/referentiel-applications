import type { ApplicationControllerSearchData, RelationType } from "@/client/types.gen";
type _RelationTypeFilter = NonNullable<NonNullable<ApplicationControllerSearchData["query"]>["is_part_of"]>;
export const RELATION_TYPE_FILTERS = {
  neutral: "NEUTRAL",
  include: "INCLUDE",
  exclude: "EXCLUDE",
} as const satisfies Record<string, _RelationTypeFilter>;
export const RELATION_TYPE_FILTERS_ARRAY = ["NEUTRAL", "INCLUDE", "EXCLUDE"] as const satisfies _RelationTypeFilter[];
export type RelationTypeFilter = (typeof RELATION_TYPE_FILTERS)[keyof typeof RELATION_TYPE_FILTERS];
export const IS_MEDIATION_SERVICE = "is_mediation_service";
export type MediationServiceField = keyof NonNullable<ApplicationControllerSearchData["query"]> & typeof IS_MEDIATION_SERVICE;

/// Types de relation réellement exposés comme filtres par l'API de recherche.
/// Le `Extract` suit le contrat : un type de relation n'apparaît ici que si la recherche
/// expose le filtre correspondant. `is_correlated_with` en fait partie depuis #2287.
export type FilterableRelationField = Extract<RelationType, keyof NonNullable<ApplicationControllerSearchData["query"]>>;
