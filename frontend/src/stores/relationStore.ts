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
    await api.relationControllerCreate({
      path: { applicationId: createRelation.applicationSourceId },
      body: {
        applicationTargetId: createRelation.applicationTargetId,
        type: createRelation.type,
        mediationServiceId: createRelation.mediationServiceId,
      },
    });
    await fetchRelationsByApplication(createRelation.applicationSourceId);
  }

  async function updateRelation(updated: RelationUpdate) {
    await api.relationControllerUpdate({
      path: { applicationId: updated.applicationSourceId, id: updated.id },
      body: {
        applicationTargetId: updated.applicationTargetId,
        type: updated.type,
        mediationServiceId: updated.mediationServiceId,
      },
    });
    return fetchRelationsByApplication(updated.applicationSourceId);
  }

  async function deleteRelation(deleted: RelationDelete) {
    await api.relationControllerDelete({
      path: { applicationId: deleted.applicationSourceId, id: deleted.applicationTargetId },
    });
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
