import type { RelationApplicationDto, RelationDto, RelationType } from "@/client/types.gen";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import api from "@/api/index";

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

  async function createRelation(applicationSourceId: string, applicationTargetId: string, type: RelationType) {
    await api.relationControllerCreate({
      path: { applicationId: applicationSourceId },
      body: { applicationTargetId, type },
    });
    await fetchRelationsByApplication(applicationSourceId);
  }

  async function updateRelation(applicationSourceId: string, id: string, data: RelationApplicationDto) {
    await api.relationControllerUpdate({
      path: { applicationId: applicationSourceId, id },
      body: data,
    });
    return fetchRelationsByApplication(applicationSourceId);
  }

  async function deleteRelation(applicationSourceId: string, id: string) {
    await api.relationControllerDelete({
      path: { applicationId: applicationSourceId, id },
    });
    return fetchRelationsByApplication(applicationSourceId);
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
