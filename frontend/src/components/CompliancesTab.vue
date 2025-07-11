<script setup lang="ts">
import { ref, watch, computed, onMounted } from "vue";
import type { Compliance } from "@/models/Application";
import useToaster from "@/composables/use-toaster";
import { defineProps, defineEmits } from "vue";
import { complianceTypesDict } from "@/composables/use-dictionary";
import ComplianceForm from "./form/ComplianceForm.vue";
import useModal from "@/composables/use-modal";
import CompliancesApi from "@/api/compliance";
import { useUserStore } from "@/stores/userStore";

const toaster = useToaster();

const props = defineProps({
  application: {
    type: Object,
    required: true,
  },
});

const userStore = useUserStore();
const userPermissions = computed(() => userStore.userPermissions);
const emit = defineEmits(["update:application"]);

const localCompliance = ref<Compliance | null>(null);
const complianceModal = useModal();
const loading = ref(false);
const isSubmitting = ref(false);
const selectedComplianceType = ref<string | null>(null);

// All possible compliance types
const allComplianceTypes = ["DIMA", "PDMA", "HOMOLOGATION", "RGAA", "DSFR", "RGPD"] as const;

// Computed property to create compliance cards
const complianceCards = computed(() => {
  return allComplianceTypes.map((type) => {
    const isConfigured = hasComplianceData(type);
    return {
      type,
      label: complianceTypesDict[type],
      compliance: localCompliance.value,
      isConfigured,
      title: getComplianceTitle(type),
      status: getComplianceStatus(type),
    };
  });
});

function hasComplianceData(type: string): boolean {
  if (!localCompliance.value) return false;

  switch (type) {
    case "DIMA":
      return !!(localCompliance.value.dima_duration_hours || localCompliance.value.dima_recovery_manager);
    case "PDMA":
      return !!(localCompliance.value.pdma_duration_hours || localCompliance.value.pdma_restoration_manager);
    case "HOMOLOGATION":
      return !!localCompliance.value.homologation_date;
    case "RGAA":
      return !!(localCompliance.value.rgaa_audit_date || localCompliance.value.rgaa_score_percentage);
    case "DSFR":
      return !!(localCompliance.value.dsfr_implemented !== undefined);
    case "RGPD":
      return !!(localCompliance.value.rgpd_has_aipd !== undefined);
    default:
      return false;
  }
}

function getComplianceTitle(type: string): string {
  if (!localCompliance.value) return complianceTypesDict[type as keyof typeof complianceTypesDict];

  switch (type) {
    case "DIMA":
      return localCompliance.value.dima_duration_hours ? `DIMA ${localCompliance.value.dima_duration_hours}H` : "DIMA";
    case "PDMA":
      return localCompliance.value.pdma_duration_hours ? `PDMA ${localCompliance.value.pdma_duration_hours}H` : "PDMA";
    case "RGAA":
      if (!localCompliance.value.rgaa_score_percentage) return "RGAA Non-conformité";
      if (localCompliance.value.rgaa_score_percentage === 100) return "RGAA Conformité totale";
      if (localCompliance.value.rgaa_score_percentage >= 50) return "RGAA Conformité partielle";
      return "RGAA Non-conformité";
    default:
      return complianceTypesDict[type as keyof typeof complianceTypesDict];
  }
}

function getComplianceStatus(type: string): string {
  if (!localCompliance.value) return "Non configuré";

  switch (type) {
    case "RGAA":
      if (!localCompliance.value.rgaa_score_percentage) return "Non-conformité";
      if (localCompliance.value.rgaa_score_percentage === 100) return "Conformité totale";
      if (localCompliance.value.rgaa_score_percentage >= 50) return "Conformité partielle";
      return "Non-conformité";
    case "DSFR":
      return localCompliance.value.dsfr_implemented ? "Implémenté" : "Non implémenté";
    case "RGPD":
      return localCompliance.value.rgpd_has_aipd ? "AIPD réalisée" : "AIPD non réalisée";
    case "DIMA":
      return localCompliance.value.dima_recovery_plan ? "Plan de reprise défini" : "En cours de configuration";
    case "PDMA":
      return localCompliance.value.pdma_backup_storage ? "Sauvegarde configurée" : "En cours de configuration";
    case "HOMOLOGATION":
      return localCompliance.value.homologation_date ? "Homologué" : "En cours";
    default:
      return hasComplianceData(type) ? "Configuré" : "Non configuré";
  }
}

function openComplianceModal(card: any) {
  selectedComplianceType.value = card.type;
  if (localCompliance.value) {
    // Edit existing compliance, focusing on the selected type
    complianceModal.openModal({ ...localCompliance.value, selectedType: card.type });
  } else {
    // Create new compliance with type pre-selected
    complianceModal.openCreateModal();
  }
}

const handleSaveCompliances = async (complianceData: any) => {
  isSubmitting.value = true;
  delete complianceData.metadataId;
  delete complianceData.selectedType; // Remove UI-only field

  try {
    if (localCompliance.value?.id) {
      await CompliancesApi.updateCompliance(props.application.id, complianceData);
      toaster.addSuccessMessage("Conformité mise à jour avec succès !");
    } else {
      await CompliancesApi.createCompliance(props.application.id, complianceData);
      toaster.addSuccessMessage("Conformité créée avec succès !");
    }

    await fetchCompliance();
    complianceModal.closeModal();
    emit("update:application", props.application);
  } catch (error: any) {
    if (error.response?.status === 409) {
      toaster.addErrorMessage("Une conformité de ce type existe déjà pour cette application.");
    } else {
      toaster.addErrorMessage("Erreur lors de la sauvegarde de la conformité.");
    }
  } finally {
    isSubmitting.value = false;
  }
};

async function deleteCompliance(card: any) {
  if (!localCompliance.value) return;

  try {
    await CompliancesApi.deleteCompliance(props.application.id);
    await fetchCompliance();
    toaster.addSuccessMessage(`Conformité ${card.label} supprimée avec succès !`);
    emit("update:application", props.application);
  } catch (error) {
    toaster.addErrorMessage("Erreur lors de la suppression de la conformité.");
  }
}

const fetchCompliance = async () => {
  loading.value = true;
  try {
    const compliance = await CompliancesApi.getCompliance(props.application.id);
    localCompliance.value = compliance;
  } catch (error: any) {
    // If no compliance exists (404), that's fine - set to null
    if (error.response?.status === 404) {
      localCompliance.value = null;
    } else {
      console.error("Error fetching compliance:", error);
      toaster.addErrorMessage("Erreur lors du chargement des conformités.");
      localCompliance.value = null;
    }
  } finally {
    loading.value = false;
  }
};

// Watch for application change (e.g., when switching between applications)
watch(
  () => props.application.id,
  (newVal, oldVal) => {
    if (newVal !== oldVal) {
      fetchCompliance();
    }
  },
);

// Fetch compliance data on component mount
onMounted(() => {
  fetchCompliance();
});
</script>

<template>
  <div class="fr-grid-row fr-grid-row--middle fr-mb-3w">
    <div class="fr-col">
      <h3 class="fr-mb-0">Gestion des conformités</h3>
      <p class="fr-text--sm fr-mb-0">
        Configurez les différents types de conformité pour cette application. Maximum 6 conformités possibles.
      </p>
    </div>
  </div>

  <AppLoader v-if="loading" />

  <div v-else class="fr-grid-row fr-grid-row--gutters">
    <div v-for="card in complianceCards" :key="card.type" class="fr-col-12 fr-col-md-6 fr-col-lg-4">
      <div class="fr-card fr-card--sm">
        <div class="fr-card__body">
          <div class="fr-card__content">
            <h4 class="fr-card__title">
              {{ card.title }}
            </h4>
            <p class="fr-card__desc fr-text--sm">
              <DsfrBadge :label="card.status" :type="card.isConfigured ? 'success' : 'new'" small />
            </p>

            <!-- Display some key info if configured -->
            <div v-if="card.isConfigured && localCompliance" class="fr-mt-2w">
              <template v-if="card.type === 'DIMA' && localCompliance.dima_duration_hours">
                <p class="fr-text--xs fr-mb-1v"><strong>Durée:</strong> {{ localCompliance.dima_duration_hours }}H</p>
                <p class="fr-text--xs fr-mb-1v" v-if="localCompliance.dima_recovery_manager">
                  <strong>Responsable:</strong> {{ localCompliance.dima_recovery_manager }}
                </p>
              </template>

              <template v-if="card.type === 'PDMA' && localCompliance.pdma_duration_hours">
                <p class="fr-text--xs fr-mb-1v"><strong>Durée:</strong> {{ localCompliance.pdma_duration_hours }}H</p>
                <p class="fr-text--xs fr-mb-1v" v-if="localCompliance.pdma_backup_storage">
                  <strong>Stockage:</strong> {{ localCompliance.pdma_backup_storage }}
                </p>
              </template>

              <template v-if="card.type === 'RGAA' && localCompliance.rgaa_score_percentage">
                <p class="fr-text--xs fr-mb-1v"><strong>Score:</strong> {{ localCompliance.rgaa_score_percentage }}%</p>
              </template>

              <template v-if="card.type === 'HOMOLOGATION' && localCompliance.homologation_date">
                <p class="fr-text--xs fr-mb-1v">
                  <strong>Date:</strong> {{ new Date(localCompliance.homologation_date).toLocaleDateString() }}
                </p>
              </template>

              <template v-if="card.type === 'DSFR' && localCompliance.dsfr_version">
                <p class="fr-text--xs fr-mb-1v"><strong>Version:</strong> {{ localCompliance.dsfr_version }}</p>
              </template>

              <template v-if="card.type === 'RGPD' && localCompliance.rgpd_dpo_name">
                <p class="fr-text--xs fr-mb-1v"><strong>DPO:</strong> {{ localCompliance.rgpd_dpo_name }}</p>
              </template>
            </div>
          </div>

          <div class="fr-card__footer">
            <div class="fr-btns-group fr-btns-group--sm">
              <DsfrButton
                :label="card.isConfigured ? 'Modifier' : 'Configurer'"
                :icon="card.isConfigured ? 'fr-icon-edit-line' : 'fr-icon-add-line'"
                tertiary
                size="sm"
                @click="openComplianceModal(card)"
                :disabled="!userPermissions.includes('write')"
              />
              <DsfrButton
                v-if="card.isConfigured"
                label="Supprimer"
                icon="fr-icon-delete-line"
                tertiary
                size="sm"
                @click="deleteCompliance(card)"
                :disabled="!userPermissions.includes('write')"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <DsfrModal
    :opened="complianceModal.isModalOpen.value || complianceModal.isCreateModalOpen.value"
    :title="complianceModal.isCreateModalOpen.value ? 'Configurer une conformité' : 'Modifier la conformité'"
    @close="complianceModal.closeModal"
  >
    <ComplianceForm
      :initial-data="complianceModal.selectedItem.value || ({ selectedType: selectedComplianceType } as any)"
      :is-submitting="isSubmitting"
      @submit="handleSaveCompliances"
      @cancel="complianceModal.closeModal"
    />
  </DsfrModal>
</template>

<style scoped>
.fr-card {
  height: 100%;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.fr-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.fr-card__footer {
  margin-top: auto;
}
</style>
