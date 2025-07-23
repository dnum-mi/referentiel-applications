import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { Relation } from "@/models/Application";
import Relations from "@/api/relation";

export const useRelationStore = defineStore("relationStore", () => {
  const relations = ref<(Relation & { isSource: boolean })[]>([]);
  const relationsAsSource = computed(() => relations.value.filter((rel) => rel.isSource));
  const relationsAsTarget = computed(() => relations.value.filter((rel) => !rel.isSource));

  async function fetchRelationsByApplication(applicationId: string) {
    relations.value = (await Relations.getAllForApplication(applicationId)).map((rel) => ({
      ...rel,
      isSource: rel.applicationSourceId === applicationId,
    }));
  }

  async function createRelation(applicationSourceId: string, applicationTargetId: string, type: string) {
    await Relations.create(applicationSourceId, applicationTargetId, type);
    await fetchRelationsByApplication(applicationSourceId);
  }

  async function updateRelation(applicationSourceId: string, id: string, data: Partial<{ type: string; applicationTargetId: string }>) {
    await Relations.update(applicationSourceId, id, data);
    return fetchRelationsByApplication(applicationSourceId);
  }

  async function deleteRelation(applicationSourceId: string, id: string) {
    await Relations.delete(applicationSourceId, id);
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
