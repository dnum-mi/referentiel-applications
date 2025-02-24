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
  noBorder: { type: Boolean, default: false },
});

function handleApplicationUpdate(updatedApplication) {
  props.application.value = updatedApplication;
  console.log("Application mise à jour:", updatedApplication);
}

const emit = defineEmits(["update:application"]);

const localCompliances = ref<Compliance[]>(Array.isArray(props.application.compliances) ? [...props.application.compliances] : []);

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

const selectedCompliance = ref<Compliance | null>(null);
const isComplianceModalOpen = ref(false);
const isCreateComplianceModalOpen = ref(false);
const currentPage = ref<number>(1);

const loading = ref(false);
const isSubmitting = ref(false);

const selectedComplianceIds = ref<string[]>([]);

const showDeleteConfirmation = ref(false);

const headers = ["Sélection", "Nom", "Type", "Statut", "Actions"];

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

function saveComplianceChanges() {
  if (selectedCompliance.value) {
    const index = localCompliances.value.findIndex((Compliance) => Compliance.id === selectedCompliance.value?.id);
    if (index !== -1) {
      localCompliances.value[index] = { ...selectedCompliance.value };
    }
  }
  if (isComplianceModalOpen.value) {
    closeComplianceModal();
  } else if (isCreateComplianceModalOpen.value) {
    closeCreateComplianceModal();
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

watch(
  () => props.application.compliances,
  (newVal) => {
    localCompliances.value = Array.isArray(newVal) ? [...newVal] : [];
  },
  { deep: true, immediate: true },
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
                <DsfrButton type="button" tertiary @click="removeSelectedCompliances" :disabled="selectedComplianceIds.length === 0">
                  Supprimer la sélection
                </DsfrButton>
              </div>
              <div class="fr-container fr-my-2v w-[800px]">
                <DsfrTable
                  v-model:current-page="currentPage"
                  title="Liste des conformités associés"
                  :headers="headers"
                  pagination
                  :rows-per-page="10"
                  :pagination-options="[10, 20, 30]"
                  bottom-action-bar-class="pagination-bottom-bar"
                  pagination-wrapper-class="pagination-wrapper"
                >
                  <tr v-for="compliance in localCompliances" :key="compliance.id">
                    <td>
                      <input type="checkbox" :value="compliance.id" v-model="selectedComplianceIds" />
                    </td>
                    <td>{{ compliance.name }}</td>
                    <td>{{ getTypeLabel(compliance.type) }}</td>
                    <td>{{ getStatusLabel(compliance.status) }}</td>
                    <td>
                      <DsfrButton type="button" @click="openComplianceModal(compliance)">Éditer</DsfrButton>
                    </td>
                  </tr>
                </DsfrTable>
              </div>
              <DsfrModal :opened="isCreateComplianceModalOpen" title="Ajouter un lien" size="lg" @close="closeCreateComplianceModal">
                <ComplianceForm
                  v-if="application"
                  :application="application"
                  :is-submitting="isSubmitting"
                  @submit="handleSaveCompliances"
                  @cancel="closeCreateComplianceModal"
                  @save-Compliances="handleSaveCompliances"
                />
              </DsfrModal>
              <DsfrModal :opened="isComplianceModalOpen" title="Modifier la conformité" size="lg" @close="closeComplianceModal">
                <ComplianceForm
                  v-if="application"
                  :initial-data="selectedCompliance"
                  :application="application"
                  :is-submitting="isSubmitting"
                  @submit="handleSaveCompliances"
                  @update:application="handleApplicationUpdate"
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
            </slot>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.compliance-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.compliance-card {
  background: white;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.1);
  width: calc(33.333% - 1rem);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.select-checkbox {
  align-self: flex-start;
  margin-bottom: 0.5rem;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1.5rem;
  gap: 1rem;
}
</style>
