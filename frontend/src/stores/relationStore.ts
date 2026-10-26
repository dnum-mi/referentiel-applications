import { isApiSuccess } from "@/api/api-result";
import type { RelationDto } from "@/client/types.gen";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import api from "@/api/index";
import type { RelationCreate, RelationDelete, RelationUpdate } from "@/models/relations";

export const useRelationStore = defineStore("relationStore", () => {
  const relations = ref<(RelationDto & { isSource: boolean })[]>([]);
  const relationsAsSource = computed(() => relations.value.filter((rel) => rel.isSource));
  const relationsAsTarget = computed(() => relations.value.filter((rel) => !rel.isSource));

  const activeApplicationId = ref<string | null>(null);
  const contextVersion = ref(0);
  let requestSequence = 0;

  function clearRelations(expectedContextVersion?: number) {
    if (expectedContextVersion !== undefined && expectedContextVersion !== contextVersion.value) return;
    contextVersion.value++;
    requestSequence++;
    relations.value = [];
    activeApplicationId.value = null;
  }

  function isCurrentContext(applicationId: string, version: number) {
    return activeApplicationId.value === applicationId && contextVersion.value === version;
  }

  function beginContext(applicationId: string) {
    contextVersion.value++;
    requestSequence++;
    relations.value = [];
    activeApplicationId.value = applicationId;
    return contextVersion.value;
  }

  function activateContext(applicationId: string) {
    if (activeApplicationId.value !== applicationId) beginContext(applicationId);
  }

  async function fetchRelationsByApplication(applicationId: string): Promise<boolean> {
    activateContext(applicationId);
    const version = contextVersion.value;
    const sequence = ++requestSequence;
    relations.value = [];
    const isCurrentRequest = () => isCurrentContext(applicationId, version) && requestSequence === sequence;
    try {
      const response = await api.relationControllerFindAll({ path: { applicationId } });
      if (!isCurrentRequest()) return false;
      if (!isApiSuccess(response)) throw new Error("Failed to fetch relations");
      relations.value = (response.data ?? []).map((rel) => ({
        ...rel,
        isSource: rel.applicationSourceId === applicationId,
      }));
      return true;
    } catch (error) {
      if (!isCurrentRequest()) return false;
      relations.value = [];
      throw error;
    }
  }

  async function mutateRelations(
    applicationId: string,
    mutate: () => Promise<{ response?: Pick<Response, "ok">; error?: unknown }>,
    errorMessage: string,
  ): Promise<boolean> {
    // Un appel autonome peut ouvrir son contexte, mais une ancienne mutation ne doit
    // jamais reprendre celui d'une fiche plus récente.
    if (activeApplicationId.value === null) activateContext(applicationId);
    const version = contextVersion.value;
    try {
      const response = await mutate();
      if (!isCurrentContext(applicationId, version)) return false;
      if (!isApiSuccess(response)) throw new Error(errorMessage);
      return await fetchRelationsByApplication(applicationId);
    } catch (error) {
      if (!isCurrentContext(applicationId, version)) return false;
      throw error;
    }
  }

  async function createRelation(createRelation: RelationCreate) {
    // #2383 : le client généré ne lève pas sur les réponses non-2xx — on vérifie le statut
    // explicitement pour ne pas laisser l'appelant afficher un faux succès.
    return mutateRelations(
      createRelation.applicationSourceId,
      () =>
        api.relationControllerCreate({
          path: { applicationId: createRelation.applicationSourceId },
          body: {
            applicationTargetId: createRelation.applicationTargetId,
            type: createRelation.type,
            mediationServiceId: createRelation.mediationServiceId,
          },
        }),
      "Failed to create relation",
    );
  }

  async function updateRelation(updated: RelationUpdate, currentApplicationId: string) {
    // #2385 : le référentiel de contrôle et de rafraîchissement est TOUJOURS l'application de la
    // fiche courante — jamais `applicationSourceId`, qui peut désigner une autre application quand
    // la relation est entrante (l'app courante en est la cible). Sinon on évaluerait la permission
    // sur l'autre application et on écraserait la liste par ses relations.
    return mutateRelations(
      currentApplicationId,
      () =>
        api.relationControllerUpdate({
          path: { applicationId: currentApplicationId, id: updated.id },
          body: {
            applicationTargetId: updated.applicationTargetId,
            type: updated.type,
            mediationServiceId: updated.mediationServiceId,
          },
        }),
      "Failed to update relation",
    );
  }

  async function deleteRelation(deleted: RelationDelete, currentApplicationId: string) {
    // #2385 : `id` doit être l'identifiant de la relation, pas `applicationTargetId`. Le
    // référentiel de contrôle/refetch est l'application de la fiche courante.
    return mutateRelations(
      currentApplicationId,
      () => api.relationControllerDelete({ path: { applicationId: currentApplicationId, id: deleted.id } }),
      "Failed to delete relation",
    );
  }

  return {
    activeApplicationId,
    contextVersion,
    beginContext,
    clearRelations,
    relations,
    relationsAsSource,
    relationsAsTarget,
    fetchRelationsByApplication,
    createRelation,
    updateRelation,
    deleteRelation,
  };
});
