import type { RelationDto } from "@/client/types.gen";
import { computed, getCurrentScope, onScopeDispose, ref, toValue, watch, type MaybeRefOrGetter } from "vue";
import api from "@/api/index";
import { RelationType } from "@/client/types.gen";
import { useRelationStore } from "@/stores/relationStore";
import { useToasterStore } from "@/stores/toasterStore";
import type { RelationCreate, RelationUpdate } from "@/models/relations";

export interface RelationRow {
  id: string;
  Sélection: string;
  "Application Source": string;
  Relation: string;
  "Application Cible": {
    label: string;
    id: string | undefined;
  };
  "Mediation Service": {
    label: string;
    id: string | undefined;
  };
  Actions: {
    edit: () => void;
    delete: () => void;
  };
}

export function useRelationManager(applicationId: MaybeRefOrGetter<string>) {
  const store = useRelationStore();
  const toaster = useToasterStore();

  const selectedRelationIds = ref<string[]>([]);
  const currentPage = ref(0);

  const showDeleteConfirmation = ref(false);
  const isAddRelationModalOpen = ref(false);
  const isEditRelationModalOpen = ref(false);
  const relationToEdit = ref<RelationDto | null>(null);

  let revision = 0;
  let disposed = false;

  function resetContext() {
    revision++;
    selectedRelationIds.value = [];
    currentPage.value = 0;
    showDeleteConfirmation.value = false;
    isAddRelationModalOpen.value = false;
    isEditRelationModalOpen.value = false;
    relationToEdit.value = null;
  }

  watch([() => toValue(applicationId), () => store.contextVersion], resetContext, { flush: "sync" });
  if (getCurrentScope()) {
    onScopeDispose(() => {
      disposed = true;
      resetContext();
    });
  }

  function captureContext() {
    return { applicationId: toValue(applicationId), version: store.contextVersion, revision };
  }

  function isCurrent(context: ReturnType<typeof captureContext>) {
    return (
      !disposed &&
      context.revision === revision &&
      context.applicationId === toValue(applicationId) &&
      context.applicationId === store.activeApplicationId &&
      context.version === store.contextVersion
    );
  }

  const headers = ["Sélection", "Application Source", "Relation", "Application Cible", "Mediation Service", "Actions"];

  const relationTypes: Record<RelationType, { source: string; target: string }> = {
    [RelationType.IS_PART_OF]: { source: "Fait partie de", target: "A comme sous‑élément" },
    [RelationType.IN_REPLACEMENT_OF]: { source: "Remplace", target: "est remplacé par" },
    [RelationType.IS_SERVICE_USER_OF]: { source: "Utilise le service de", target: "Fournit le service à" },
    [RelationType.IS_DATA_USER_OF]: { source: "Utilise la donnée de", target: "Fournit la donnée à" },
    [RelationType.USE_SSO_OF]: { source: "Utilise le SSO de", target: "Fournit le SSO à" },
    [RelationType.IS_CORRELATED_WITH]: { source: "Est corrélée à", target: "Est corrélée à" },
  };

  function getRelationLabelForSide(type: RelationType, isSource: boolean): string {
    const rel = relationTypes[type];
    if (!rel) return type;
    return isSource ? rel.source : rel.target;
  }

  function editRelation(rel: RelationDto) {
    relationToEdit.value = { ...rel };
    isEditRelationModalOpen.value = true;
  }

  function deleteSingleRelation(rel: RelationDto) {
    selectedRelationIds.value = [rel.id];
    showDeleteConfirmation.value = true;
  }

  function createRow(rel: RelationDto & { isSource: boolean }): RelationRow {
    const context = captureContext();
    const sourceLabel = rel.sourceApplication?.label || rel.applicationSourceId || "❌ Source inconnue";
    const targetLabel = rel.targetApplication?.label || rel.applicationTargetId || "❌ Cible inconnue";

    return {
      id: rel.id,
      Sélection: rel.id,
      "Application Source": rel.isSource ? sourceLabel : targetLabel,
      Relation: getRelationLabelForSide(rel.type, rel.isSource),
      "Application Cible": {
        label: rel.isSource ? targetLabel : sourceLabel,
        id: rel.isSource ? rel.applicationTargetId : rel.applicationSourceId,
      },
      "Mediation Service": {
        label: rel.mediationService?.label || "",
        id: rel.mediationService?.id,
      },
      Actions: {
        edit: () => {
          if (isCurrent(context)) editRelation(rel);
        },
        delete: () => {
          if (isCurrent(context)) deleteSingleRelation(rel);
        },
      },
    };
  }

  const rows = computed<RelationRow[]>(() => (store.activeApplicationId === toValue(applicationId) ? store.relations.map(createRow) : []));

  function removeSelectedRelations() {
    if (!selectedRelationIds.value.length) {
      toaster.addErrorMessage("Aucune sélection.");
      return;
    }
    showDeleteConfirmation.value = true;
  }

  async function confirmDelete() {
    const context = captureContext();
    if (!isCurrent(context)) return;
    const relationIds = [...selectedRelationIds.value];
    try {
      await Promise.all(
        relationIds.map((id) =>
          api.relationControllerDelete({
            path: { applicationId: context.applicationId, id },
          }),
        ),
      );
      if (!isCurrent(context)) return;
      const published = await store.fetchRelationsByApplication(context.applicationId);
      if (!published || !isCurrent(context)) return;
      selectedRelationIds.value = [];
      showDeleteConfirmation.value = false;
      toaster.addSuccessMessage("Relations supprimées avec succès !");
    } catch {
      if (isCurrent(context)) toaster.addErrorMessage("Erreur lors de la suppression des relations.");
    }
  }

  function cancelDelete() {
    showDeleteConfirmation.value = false;
  }

  function openAddRelationModal() {
    if (!isCurrent(captureContext())) return;
    isAddRelationModalOpen.value = true;
  }

  function closeAddRelationModal() {
    isAddRelationModalOpen.value = false;
  }

  function closeEditRelationModal() {
    isEditRelationModalOpen.value = false;
    relationToEdit.value = null;
  }

  async function handleUpdateRelation(updated: RelationUpdate) {
    const context = captureContext();
    if (!isCurrent(context) || !rows.value.some((row) => row.id === updated.id)) return;
    try {
      const published = await store.updateRelation(updated, context.applicationId);
      if (!published || !isCurrent(context)) return;
      toaster.addSuccessMessage("Relation mise à jour avec succès!");
      closeEditRelationModal();
    } catch {
      // On garde la modale ouverte : l'utilisateur peut corriger et réessayer (#2383).
      if (isCurrent(context)) toaster.addErrorMessage("Erreur lors de la mise à jour de la relation.");
    }
  }

  async function handleCreateRelation(created: RelationCreate) {
    const context = captureContext();
    if (!isCurrent(context) || created.applicationSourceId !== context.applicationId) return;
    try {
      const published = await store.createRelation(created);
      if (!published || !isCurrent(context)) return;
      toaster.addSuccessMessage("Relation créée avec succès!");
      closeAddRelationModal();
    } catch {
      // On garde la modale ouverte : l'utilisateur peut corriger et réessayer (#2383).
      if (isCurrent(context)) toaster.addErrorMessage("Erreur lors de la création de la relation.");
    }
  }

  return {
    headers,
    rows,
    selectedRelationIds,
    currentPage,
    showDeleteConfirmation,
    isAddRelationModalOpen,
    isEditRelationModalOpen,
    relationToEdit,

    removeSelectedRelations,
    confirmDelete,
    cancelDelete,
    openAddRelationModal,
    closeAddRelationModal,
    handleCreateRelation,
    closeEditRelationModal,
    handleUpdateRelation,
  };
}
