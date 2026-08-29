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

  async function updateRelation(updated: RelationUpdate) {
    const response = await api.relationControllerUpdate({
      path: { applicationId: updated.applicationSourceId, id: updated.id },
      body: {
        applicationTargetId: updated.applicationTargetId,
        type: updated.type,
        mediationServiceId: updated.mediationServiceId,
      },
    });
    if (!response.response.ok) {
      throw new Error("Failed to update relation");
    }
    return fetchRelationsByApplication(updated.applicationSourceId);
  }

  async function deleteRelation(deleted: RelationDelete) {
    const response = await api.relationControllerDelete({
      path: { applicationId: deleted.applicationSourceId, id: deleted.applicationTargetId },
    });
    if (!response.response.ok) {
      throw new Error("Failed to delete relation");
    }
    return fetchRelationsByApplication(deleted.applicationSourceId);
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
