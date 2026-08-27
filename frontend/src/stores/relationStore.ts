import type { RelationDto } from "@/client/types.gen";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import api from "@/api/index";
import type { RelationCreate, RelationDelete, RelationUpdate } from "@/models/relations";

export const useRelationStore = defineStore("relationStore", () => {
  const relations = ref<(RelationDto & { isSource: boolean })[]>([]);
  const relationsAsSource = computed(() => relations.value.filter((rel) => rel.isSource));
  const relationsAsTarget = computed(() => relations.value.filter((rel) => !rel.isSource));

  async function fetchRelationsByApplication(applicationId: string) {
    const response = await api.relationControllerFindAll({
      path: { applicationId },
    });
    if (!response.response.ok) {
      throw new Error("Failed to fetch relations");
    }
    if (!response.data) {
      relations.value = [];
      return;
    }
    // Map the relations to include isSource property based on applicationId
    relations.value = response.data.map((rel) => ({
      ...rel,
      isSource: rel.applicationSourceId === applicationId,
    }));
  }

  async function createRelation(createRelation: RelationCreate) {
    // #2383 : le client généré ne lève pas sur les réponses non-2xx — on vérifie le statut
    // explicitement pour ne pas laisser l'appelant afficher un faux succès.
    const response = await api.relationControllerCreate({
      path: { applicationId: createRelation.applicationSourceId },
      body: {
        applicationTargetId: createRelation.applicationTargetId,
        type: createRelation.type,
        mediationServiceId: createRelation.mediationServiceId,
      },
    });
    if (!response.response.ok) {
      throw new Error("Failed to create relation");
    }
    await fetchRelationsByApplication(createRelation.applicationSourceId);
  }

  async function updateRelation(updated: RelationUpdate, currentApplicationId: string) {
    // #2385 : le référentiel de contrôle et de rafraîchissement est TOUJOURS l'application de la
    // fiche courante — jamais `applicationSourceId`, qui peut désigner une autre application quand
    // la relation est entrante (l'app courante en est la cible). Sinon on évaluerait la permission
    // sur l'autre application et on écraserait la liste par ses relations.
    const response = await api.relationControllerUpdate({
      path: { applicationId: currentApplicationId, id: updated.id },
      body: {
        applicationTargetId: updated.applicationTargetId,
        type: updated.type,
        mediationServiceId: updated.mediationServiceId,
      },
    });
    if (!response.response.ok) {
      throw new Error("Failed to update relation");
    }
    return fetchRelationsByApplication(currentApplicationId);
  }

  async function deleteRelation(deleted: RelationDelete, currentApplicationId: string) {
    // #2385 : `id` doit être l'identifiant de la relation, pas `applicationTargetId`. Le
    // référentiel de contrôle/refetch est l'application de la fiche courante.
    const response = await api.relationControllerDelete({
      path: { applicationId: currentApplicationId, id: deleted.id },
    });
    if (!response.response.ok) {
      throw new Error("Failed to delete relation");
    }
    return fetchRelationsByApplication(currentApplicationId);
  }

  return {
    relations,
    relationsAsSource,
    relationsAsTarget,
    fetchRelationsByApplication,
    createRelation,
    updateRelation,
    deleteRelation,
  };
});
