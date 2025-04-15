<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import type { Compliance } from "@/models/Application";
import useToaster from "@/composables/use-toaster";
import { defineProps, defineEmits } from "vue";
import { complianceTypesDict, complianceStatusesDict } from "@/composables/use-dictionary";
import ComplianceForm from "./form/ComplianceForm.vue";
import useModal from "@/composables/use-modal";
import CompliancesApi from "@/api/compliance";

const toaster = useToaster();

const props = defineProps({
  application: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["update:application"]);

const localCompliances = ref<Compliance[]>([]);
const selectedComplianceIds = ref<string[]>([]);

const currentPage = ref(0);
const headers = ["Sélection", "Nom", "Type", "Statut", "Actions"];
const rows = ref<(string | { component: string; [k: string]: unknown })[][]>([]);

const complianceModal = useModal();
const showDeleteConfirmation = ref(false);
const loading = ref(false);
const isSubmitting = ref(false);

function getTypeLabel(value: string): string {
  return value ? complianceTypesDict[value] || "Type inconnu" : "Aucun type sélectionné";
}

function getStatusLabel(value: string): string {
  return value ? complianceStatusesDict[value] || "Statut inconnu" : "Aucun Statut sélectionné";
}

const handleSaveCompliances = async (newCompliance) => {
  isSubmitting.value = true;
  try {
    if (newCompliance.id) {
      // Update existing compliance
      await CompliancesApi.updateCompliance(props.application.id, newCompliance.id, newCompliance);
    } else {
      // Create new compliance
      await CompliancesApi.createCompliance(props.application.id, newCompliance);
    }

    // Re-fetch all compliances to get the latest data
    await fetchCompliances();
    complianceModal.closeModal();
    toaster.addSuccessMessage("Conformité sauvegardée avec succès !");
  } catch (error) {
    toaster.addErrorMessage("Erreur lors de la sauvegarde de la conformité.");
  } finally {
    isSubmitting.value = false;
  }
};

function removeSelectedCompliances() {
  if (selectedComplianceIds.value.length === 0) {
    toaster.addErrorMessage("Aucune sélection.");
    return;
  }
  showDeleteConfirmation.value = true;
}

async function confirmDelete() {
  loading.value = true;
  try {
    for (const id of selectedComplianceIds.value) {
      await CompliancesApi.deleteCompliance(props.application.id, id);
    }

    localCompliances.value = localCompliances.value.filter((compliance) => !selectedComplianceIds.value.includes(compliance.id));

    selectedComplianceIds.value = [];
    updateRows();
    showDeleteConfirmation.value = false;
    toaster.addSuccessMessage("Conformités supprimées avec succès !");
  } catch (error) {
    toaster.addErrorMessage("Erreur lors de la suppression des conformités.");
  } finally {
    loading.value = false;
  }
}

function cancelDelete() {
  showDeleteConfirmation.value = false;
}

function updateRows() {
  rows.value = localCompliances.value.map((compliance) => [
    compliance.id,
    compliance.name,
    getTypeLabel(compliance.type),
    getStatusLabel(compliance.status),
    {
      component: "DsfrButton",
      label: "Modifier",
      onClick: () => complianceModal.openModal(compliance),
    },
  ]);
}

const fetchCompliances = async () => {
  loading.value = true;
  try {
    const compliances = await CompliancesApi.getCompliances(props.application.id);
    localCompliances.value = compliances;
    updateRows();
  } catch (error) {
    toaster.addErrorMessage("Erreur lors du chargement des conformités.");
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchCompliances();
});

// Watch for application change (e.g., when switching between applications)
watch(
  () => props.application.id,
  (newVal, oldVal) => {
    if (newVal !== oldVal) {
      fetchCompliances();
    }
  },
);
</script>

<template>
  <div class="fr-grid-row fr-grid-row--middle fr-mb-3w">
    <div class="fr-col">
      <h3 class="fr-mb-0">Gestions des conformités</h3>
    </div>
    <div class="fr-col-auto">
      <DsfrButton
        type="button"
        class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-add-line"
        @click="complianceModal.openCreateModal()"
      >
        Ajouter une conformité
      </DsfrButton>
    </div>
  </div>
  <div v-if="!loading && rows.length === 0" class="text-center">
    <p>Aucune conformité enregistrée.</p>
  </div>
  <div v-else>
    <div class="global-delete">
      <DsfrButton
        type="button"
        tertiary
        @click="removeSelectedCompliances"
        icon="fr-icon-delete-line"
        :disabled="selectedComplianceIds.length === 0"
      >
        Supprimer la sélection
      </DsfrButton>
    </div>
    <AppLoader v-if="loading"></AppLoader>
    <DsfrDataTable
      v-else
      v-model:selection="selectedComplianceIds"
      v-model:current-page="currentPage"
      :headers-row="headers"
      :rows="rows"
      row-key="id"
      title="Liste des conformités associées"
      pagination
      :rows-per-page="5"
      :pagination-options="[5, 10, 20, 30]"
      bottom-action-bar-class="bottom-action-bar-class"
      pagination-wrapper-class="pagination-wrapper-class"
      sorted="id"
      :sortable-rows="['id']"
    >
      <template #cell="{ colKey, cell }">
        <template v-if="colKey === 'Sélection'">
          <input type="checkbox" :value="cell" v-model="selectedComplianceIds" />
        </template>
        <template v-else-if="colKey === 'Actions'">
          <DsfrButton tertiary size="sm" icon="fr-icon-edit-line" @click="cell.onClick">{{ cell.label }}</DsfrButton>
        </template>
        <template v-else>
          {{ cell }}
        </template>
      </template>
    </DsfrDataTable>
  </div>

  <DsfrModal
    :opened="complianceModal.isModalOpen.value || complianceModal.isCreateModalOpen.value"
    :title="complianceModal.isCreateModalOpen.value ? 'Ajouter une conformité' : 'Modifier la conformité'"
    @close="complianceModal.closeModal"
  >
    <ComplianceForm
      v-bind="{ application, initialData: complianceModal.selectedItem.value }"
      :is-submitting="isSubmitting"
      @submit="handleSaveCompliances"
      @cancel="complianceModal.closeModal"
    />
  </DsfrModal>

  <DeleteConfirmationModal :opened="showDeleteConfirmation" itemName="conformités" @confirm="confirmDelete" @cancel="cancelDelete" />
</template>

<style scoped>
input[type="checkbox"] {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 2px solid var(--dsfr-border, #ccc);
  position: relative;
  transition:
    background-color 0.3s ease,
    border-color 0.3s ease;
}
</style>
