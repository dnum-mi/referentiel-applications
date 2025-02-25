<script setup lang="ts">
import { ref, computed, watch } from "vue";
import Applications from "@/api/application";
import type { Application, Compliance } from "@/models/Application";
import useToaster from "@/composables/use-toaster";
import AppDate from "./AppDate.vue";
import { defineProps, defineEmits } from "vue";

const toaster = useToaster();

const props = defineProps({
  application: {
    type: Object,
    required: true,
  },
  title: { type: String, default: "" },
  icon: { type: String, default: "" },
  noBorder: { type: Boolean, default: true },
});

const emit = defineEmits(["update:application"]);

const localCompliances = ref<Compliance[]>(Array.isArray(props.application.compliances) ? [...props.application.compliances] : []);
const selectedComplianceIds = ref<string[]>([]);
const selectedCompliance = ref<Compliance | null>(null);

const currentPage = ref<number>(0);
const headers = ["Sélection", "Nom", "Type", "Statut", "Actions"];
const rows = ref<(string | { component: string; [k: string]: unknown })[][]>([]);

const isComplianceModalOpen = ref(false);
const isCreateComplianceModalOpen = ref(false);
const showDeleteConfirmation = ref(false);

const loading = ref(false);
const isSubmitting = ref(false);

const complianceTypesDict = {
  regulation: "Réglementation",
  standard: "Standard",
  policy: "Politique",
  contractual: "Contractuel",
  security: "Sécurité",
  privacy: "Confidentialité",
};
const complianceStatusesDict = {
  compliant: "Conforme",
  non_compliant: "Non conforme",
  partially_compliant: "Partiellement conforme",
  not_concerned: "Non concerné",
};

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
    existingIds.has(compliance.id) ? compliance : { ...compliance, id: undefined },
  );
  loading.value = true;
  try {
    const updatedApplication = await Applications.patchApplication({
      ...props.application,
      compliances: compliancesToSave,
    });
    emit("update:application", {
      ...props.application,
      compliances: compliancesToSave,
    });
    toaster.addSuccessMessage("Conformités sauvegardées avec succès !");
    closeComplianceModal();
    closeCreateComplianceModal();
  } catch (error) {
    toaster.addErrorMessage("Erreur lors de la sauvegarde des conformités.");
  } finally {
    loading.value = false;
  }
}

const openComplianceModal = (Compliance: Compliance) => {
  selectedCompliance.value = { ...Compliance };
  isComplianceModalOpen.value = true;
  isCreateComplianceModalOpen.value = false;
};

const openCreateComplianceModal = () => {
  isCreateComplianceModalOpen.value = true;
  isComplianceModalOpen.value = false;
};

const closeComplianceModal = () => {
  selectedCompliance.value = null;
  isComplianceModalOpen.value = false;
};

const closeCreateComplianceModal = () => {
  selectedCompliance.value = null;
  isCreateComplianceModalOpen.value = false;
};

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
    onClick: () => openComplianceModal(compliance),
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
        onClick: () => openComplianceModal(compliance),
      },
    ]);
  },
  { deep: true },
);
</script>

<template>
  <div class="fr-grid-row fr-grid-row--gutters">
    <div class="fr-col-12">
      <div class="fr-card" :class="{ 'fr-card--no-border': noBorder }">
        <div class="fr-card__body">
          <div class="fr-card__content">
            <slot>
              <div class="fr-grid-row fr-grid-row--middle fr-mb-3w">
                <div class="fr-col">
                  <h3 class="fr-mb-0">Gestions des conformités</h3>
                </div>
                <div class="fr-col-auto">
                  <DsfrButton
                    type="button"
                    class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-add-line"
                    @click="openCreateComplianceModal()"
                    >Ajouter une conformité</DsfrButton
                  >
                </div>
              </div>
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
              <div class="fr-container fr-my-2v w-[100%]" style="height: auto">
                <div v-if="rows.length === 0" class="text-center">
                  <p>Aucune conformité enregistrée.</p>
                </div>
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
            </slot>
          </div>
        </div>
      </div>
    </div>
  </div>
  <DsfrModal :opened="isCreateComplianceModalOpen" title="Ajouter un lien" size="lg" @close="closeCreateComplianceModal">
    <ComplianceForm
      v-if="application"
      :application="application"
      :is-submitting="isSubmitting"
      @submit="handleSaveCompliances"
      @cancel="closeCreateComplianceModal"
    />
  </DsfrModal>
  <DsfrModal :opened="isComplianceModalOpen" title="Modifier la conformité" size="lg" @close="closeComplianceModal">
    <ComplianceForm
      v-if="application"
      :initial-data="selectedCompliance"
      :application="application"
      :is-submitting="isSubmitting"
      @submit="handleSaveCompliances"
      @cancel="closeComplianceModal"
    />
  </DsfrModal>
  <DsfrModal :opened="showDeleteConfirmation" title="Confirmation de suppression" size="sm" @close="cancelDelete">
    <p>Êtes-vous sûr de vouloir supprimer les conformités sélectionnées ? Cette action est irréversible.</p>
    <div class="actions">
      <DsfrButton type="button" @click="cancelDelete" tertiary>Annuler</DsfrButton>
      <DsfrButton type="button" @click="confirmDelete" primary>Confirmer</DsfrButton>
    </div>
  </DsfrModal>
</template>

<style scoped>
.fr-container {
  height: auto;
  max-height: 100%;
  overflow: auto;
}

.fr-card {
  height: 100%;
}
.fr-card__content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.global-delete {
  margin-bottom: 1rem;
  display: flex;
  justify-content: flex-start;
}

.actions {
  margin-top: 1.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.edit-btn {
  font-size: 0.85rem;
}

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
