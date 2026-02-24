import type { RelationDto } from "@/client/types.gen";
import type { Relation } from "@/models/Application";
import { computed, ref } from "vue";
import api from "@/api/index";
import { RelationType } from "@/client/types.gen";
import { useRelationStore } from "@/stores/relationStore";
import { useToasterStore } from "@/stores/toasterStore";

export interface RelationRow {
  id: string;
  Sélection: string;
  "Application Source": string;
  Relation: string;
  "Application Cible": {
    label: string;
    id: string | undefined;
  };
  Actions: {
    edit: () => void;
    delete: () => void;
  };
}

export function useRelationManager(applicationId: string) {
  const store = useRelationStore();
  const toaster = useToasterStore();

  const selectedRelationIds = ref<string[]>([]);
  const currentPage = ref(0);

  const showDeleteConfirmation = ref(false);
  const isAddRelationModalOpen = ref(false);
  const isEditRelationModalOpen = ref(false);
  const relationToEdit = ref<RelationDto | null>(null);

  const headers = ["Sélection", "Application Source", "Relation", "Application Cible", "Actions"];

  const relationTypes: Record<RelationType, { source: string; target: string }> = {
    [RelationType.IS_PART_OF]: { source: "Fait partie de", target: "A comme sous‑élément" },
    [RelationType.IN_REPLACEMENT_OF]: { source: "Remplace", target: "est remplacé par" },
    [RelationType.IS_SERVICE_USER_OF]: { source: "Utilise le service de", target: "Fournit le service à" },
    [RelationType.IS_DATA_USER_OF]: { source: "Utilise la donnée de", target: "Fournit la donnée à" },
    [RelationType.USE_SSO_OF]: { source: "Utilise le SSO de", target: "Fournit le SSO à" },
  };

  function getRelationLabelForSide(type: RelationType, isSource: boolean): string {
    const rel = relationTypes[type];
    return rel ? (isSource ? rel.source : rel.target) : type;
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
      Actions: {
        edit: () => editRelation(rel),
        delete: () => deleteSingleRelation(rel),
      },
    };
  }

  const rows = computed<RelationRow[]>(() => store.relations.map(createRow));

  function removeSelectedRelations() {
    if (!selectedRelationIds.value.length) {
      toaster.addErrorMessage("Aucune sélection.");
      return;
    }
    showDeleteConfirmation.value = true;
  }

  async function confirmDelete() {
    try {
      await Promise.all(
        selectedRelationIds.value.map((id) =>
          api.relationControllerDelete({
            path: { applicationId, id },
          }),
        ),
      );

      await store.fetchRelationsByApplication(applicationId);
      selectedRelationIds.value = [];
      showDeleteConfirmation.value = false;
      toaster.addSuccessMessage("Relations supprimées avec succès !");
    } catch {
      toaster.addErrorMessage("Erreur lors de la suppression des relations.");
    }
  }

  function cancelDelete() {
    showDeleteConfirmation.value = false;
  }

  function openAddRelationModal() {
    isAddRelationModalOpen.value = true;
  }

  function closeAddRelationModal() {
    isAddRelationModalOpen.value = false;
  }

  function closeEditRelationModal() {
    isEditRelationModalOpen.value = false;
    relationToEdit.value = null;
  }

  async function handleUpdateRelation(updated: RelationDto) {
    await store.updateRelation(updated.applicationSourceId, updated.id, {
      type: updated.type,
      applicationTargetId: updated.applicationTargetId,
    });
    toaster.addSuccessMessage("Relation mise à jour avec succès!");
    closeEditRelationModal();
  }

  async function handleCreateRelation(created: Omit<Relation, "id">) {
    await store.createRelation(created.applicationSourceId, created.applicationTargetId, created.type);
    toaster.addSuccessMessage("Relation créée avec succès!");
    closeAddRelationModal();
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
