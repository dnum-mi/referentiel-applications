import { ref, computed } from "vue";
import { useRelationStore } from "@/stores/relationStore";
import useToaster from "@/composables/use-toaster";
import type { Application, Relation } from "@/models/Application";
import Relations from "@/api/relation";

export function useRelationManager(application: Application, emit: (event: string, payload?: any) => void) {
  const store = useRelationStore();
  const toaster = useToaster();

  const selectedRelationIds = ref<string[]>([]);
  const currentPage = ref(0);

  const showDeleteConfirmation = ref(false);
  const isAddRelationModalOpen = ref(false);
  const isEditRelationModalOpen = ref(false);
  const relationToEdit = ref<Relation | null>(null);

  const headers = ["Sélection", "Source", "Relation", "Cible", "Actions"];

  const relationTypes: Record<string, { source: string; target: string }> = {
    is_part_of: { source: "Fait partie de", target: "A comme sous‑élément" },
    in_replacement_of: { source: "Remplace", target: "Remplace" },
    is_service_user_of: { source: "Utilise le service de", target: "Fournit le service à" },
    is_data_user_of: { source: "Utilise la donnée de", target: "Fournit la donnée à" },
  };

  function getRelationLabelForSide(type: string, isSource: boolean): string {
    const rel = relationTypes[type];
    return rel ? (isSource ? rel.source : rel.target) : type;
  }

  function createRow(rel: Relation & { isSource: boolean }) {
    const sourceLabel = rel.sourceApplication?.label || rel.applicationSource || "❌ Source inconnue";
    const targetLabel = rel.targetApplication?.label || rel.applicationTarget || "❌ Cible inconnue";

    return {
      id: rel.id,
      Sélection: rel.id,
      Source: rel.isSource ? sourceLabel : targetLabel,
      Relation: getRelationLabelForSide(rel.type, rel.isSource),
      Cible: {
        label: rel.isSource ? targetLabel : sourceLabel,
        id: rel.isSource ? rel.applicationTarget : rel.applicationSource,
      },
      Actions: { edit: () => editRelation(rel) },
    };
  }

  const rows = computed(() => store.allRelations.map((rel) => createRow(rel)));

  function editRelation(rel: Relation) {
    relationToEdit.value = { ...rel };
    isEditRelationModalOpen.value = true;
  }

  function removeSelectedRelations() {
    if (!selectedRelationIds.value.length) {
      toaster.addErrorMessage("Aucune sélection.");
      return;
    }
    showDeleteConfirmation.value = true;
  }

  async function confirmDelete() {
    try {
      await Promise.all(selectedRelationIds.value.map((id) => Relations.delete(id)));
      store.removeRelations(selectedRelationIds.value);
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

  function handleAddRelation(updatedApp: Application) {
    store.setApplication(updatedApp);
    emit("update:application", updatedApp);
  }

  function closeEditRelationModal() {
    isEditRelationModalOpen.value = false;
    relationToEdit.value = null;
  }

  function handleUpdateRelation(updated: Relation) {
    store.updateRelation(updated);
    toaster.addSuccessMessage("Relation mise à jour avec succès !");
    closeEditRelationModal();
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

    editRelation,
    removeSelectedRelations,
    confirmDelete,
    cancelDelete,
    openAddRelationModal,
    closeAddRelationModal,
    handleAddRelation,
    closeEditRelationModal,
    handleUpdateRelation,
  };
}
