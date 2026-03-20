import type { ApplicationControllerSearchData } from "@/client/types.gen";
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
