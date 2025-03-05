<script setup lang="ts">
import { ref, watch } from "vue";
import Applications from "@/api/application";
import type { Compliance } from "@/models/Application";
import useToaster from "@/composables/use-toaster";
import { defineProps, defineEmits } from "vue";
import { complianceTypesDict, complianceStatusesDict } from "@/composables/use-dictionary";
import ComplianceForm from "./form/ComplianceForm.vue";
import useModal from "@/composables/use-modal";

const toaster = useToaster();

const props = defineProps({
  application: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["update:application"]);

const localCompliances = ref<Compliance[]>(Array.isArray(props.application.compliances) ? [...props.application.compliances] : []);
const selectedComplianceIds = ref<string[]>([]);

const currentPage = ref<number>(0);
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

const handleSaveCompliances = (newCompliance) => {
  const index = localCompliances.value.findIndex((compliance) => compliance.id === newCompliance.id);
  if (index !== -1) {
    localCompliances.value[index] = { ...localCompliances.value[index], ...newCompliance };
  } else {
    localCompliances.value.push({ ...newCompliance });
  }
  saveAll();
};

async function saveAll() {
  for (const compliance of localCompliances.value) {
    if (!compliance.name.trim()) {
      toaster.addErrorMessage("Le nom de la conformité est requis.");
      return;
    }
  }

  const existingIds = new Set((props.application.compliances || []).map((c: Compliance) => c.id));
  const compliancesToSave = localCompliances.value.map((compliance) =>
    existingIds.has(compliance.id) ? compliance : { ...compliance, id: compliance.id ?? undefined },
  );
  loading.value = true;
  try {
    await Applications.patchApplication({
      ...props.application,
      compliances: compliancesToSave,
    });
    emit("update:application", {
      ...props.application,
      compliances: compliancesToSave,
    });
    toaster.addSuccessMessage("Conformités sauvegardées avec succès !");
    complianceModal.closeModal();
  } catch (error) {
    toaster.addErrorMessage("Erreur lors de la sauvegarde des conformités.");
  } finally {
    loading.value = false;
  }
}

function removeSelectedCompliances() {
  if (selectedComplianceIds.value.length === 0) {
    toaster.addErrorMessage("Aucune sélection.");
    return;
  }
  showDeleteConfirmation.value = true;
}

function confirmDelete() {
  localCompliances.value = localCompliances.value.filter((Compliance) => !selectedComplianceIds.value.includes(Compliance.id));
  selectedComplianceIds.value = [];
  saveAll();
  showDeleteConfirmation.value = false;
}

function cancelDelete() {
  showDeleteConfirmation.value = false;
}

rows.value = localCompliances.value.map((compliance: any) => [
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

watch(
  () => props.application.compliances,
  (newVal) => {
    localCompliances.value = Array.isArray(newVal) ? [...newVal] : [];
  },
  { deep: true, immediate: true },
);
watch(
  localCompliances,
  () => {
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
  },
  { deep: true },
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
  <div v-if="rows.length === 0" class="text-center">
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
    <DsfrDataTable
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
