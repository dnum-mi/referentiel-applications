import type { RelationDto, RelationType } from "@/client/types.gen";
import type { RelationUpdate } from "@/models/relations";

/**
 * Construit le payload de mise à jour d'une relation en respectant son sens de stockage (#2385).
 *
 * - Depuis la fiche source (`applicationSourceId === currentApplicationId`) : la contre-partie
 *   choisie devient la cible.
 * - Depuis la fiche cible (relation entrante) : la source et le sens restent inchangés ; seuls le
 *   type et le service de médiation sont modifiables, et la cible reste l'application courante — ce
 *   qui garantit qu'on ne détache jamais silencieusement l'application courante.
 */
export function buildRelationUpdate(
  relation: Pick<RelationDto, "id" | "applicationSourceId">,
  currentApplicationId: string,
  edited: {
    type: RelationType;
    mediationServiceId: string | null;
    counterpartId: string;
  },
): RelationUpdate {
  const isEditingFromSource = relation.applicationSourceId === currentApplicationId;

  return {
    id: relation.id,
    type: edited.type,
    mediationServiceId: edited.mediationServiceId,
    applicationSourceId: isEditingFromSource ? currentApplicationId : relation.applicationSourceId,
    applicationTargetId: isEditingFromSource ? edited.counterpartId : currentApplicationId,
  };
}
