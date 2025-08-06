<script setup lang="ts">
import { ref, computed, watch, defineProps, defineEmits } from "vue";
import type { ApplicationWithPerms, Compliance } from "@/models/Application";
import useToaster from "@/composables/use-toaster";
import { testResultsDict, backupStorageDict, durationHoursOptions } from "@/composables/use-dictionary";
import { useUserStore } from "@/stores/userStore";
import { useComplianceStore } from "@/stores/complianceStore";
import { AdminLevel } from "@/models/user";

const props = defineProps<{
  application: ApplicationWithPerms
}>();

const emit = defineEmits<{
  "update:application": [value: ApplicationWithPerms]
}>();

const toaster = useToaster();

const userStore = useUserStore();
const complianceStore = useComplianceStore();
const loading = ref(false);
const isSubmitting = ref(false);
const canEdit = computed(() => userStore.adminLevel >= AdminLevel.WRITE || props.application.myPerms.has("writeCompliances"));

const form = ref<Partial<Compliance>>({});

// Computed options for dropdowns
const testResults = computed(() => Object.entries(testResultsDict).map(([value, text]) => ({ value, text })));

const backupStorageOptions = computed(() => Object.entries(backupStorageDict).map(([value, text]) => ({ value, text })));

watch(
  () => complianceStore.compliance,
  (newCompliances) => {
    if (newCompliances) {
      form.value = {
        ...newCompliances,
        // Convert date fields to proper format for date inputs, only if they exist
        dima_last_test_date: newCompliances.dima_last_test_date?.split("T")[0] || undefined,
        pdma_last_test_date: newCompliances.pdma_last_test_date?.split("T")[0] || undefined,
        homologation_date: newCompliances.homologation_date?.split("T")[0] || undefined,
        rgaa_audit_date: newCompliances.rgaa_audit_date?.split("T")[0] || undefined,
      };
    }
  },
  { immediate: true },
);

async function handleSave() {
  isSubmitting.value = true;

  try {
    const submissionData: Record<string, any> = { ...form.value };

    // Remove UI-only fields
    delete submissionData.id;
    delete submissionData.applicationId;

    // Remove empty string and null values
    Object.keys(submissionData).forEach((key) => {
      if (submissionData[key] === "" || submissionData[key] === null) {
        delete submissionData[key];
      }
    });

    // Convert select fields to integers
    if (submissionData.dima_duration_hours) {
      submissionData.dima_duration_hours = Number.parseInt(submissionData.dima_duration_hours, 10);
    }
    if (submissionData.pdma_duration_hours) {
      submissionData.pdma_duration_hours = Number.parseInt(submissionData.pdma_duration_hours, 10);
    }
    if (submissionData.homologation_duration_months) {
      submissionData.homologation_duration_months = Number.parseInt(submissionData.homologation_duration_months, 10);
    }
    if (submissionData.rgaa_score_percentage) {
      submissionData.rgaa_score_percentage = Number.parseInt(submissionData.rgaa_score_percentage, 10);
    }

    // Convert date strings to Date objects
    if (submissionData.dima_last_test_date) {
      submissionData.dima_last_test_date = new Date(submissionData.dima_last_test_date);
    }
    if (submissionData.pdma_last_test_date) {
      submissionData.pdma_last_test_date = new Date(submissionData.pdma_last_test_date);
    }
    if (submissionData.homologation_date) {
      submissionData.homologation_date = new Date(submissionData.homologation_date);
    }
    if (submissionData.rgaa_audit_date) {
      submissionData.rgaa_audit_date = new Date(submissionData.rgaa_audit_date);
    }

    console.log("Saving compliance data:", submissionData);

    if (form.value.id) {
      // Update existing compliance
      await complianceStore.updateCompliance(props.application.id, submissionData);
    } else {
      // Create new compliance
      await complianceStore.createCompliance(props.application.id, submissionData);
    }

    await complianceStore.fetchCompliance(props.application.id);
    emit("update:application", props.application);
  } catch (_error) {
    toaster.addErrorMessage("Erreur lors de la sauvegarde de la conformité.");
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="fr-grid-row fr-grid-row--middle fr-mb-3w">
    <div class="fr-col">
      <h3 class="fr-mb-0">
        Gestion des conformités
      </h3>
      <p class="fr-text--sm fr-mb-0">
        Configurez les différents types de conformité pour cette application.
      </p>
    </div>
  </div>

  <AppLoader v-if="loading" />

  <form v-else class="compliance-form" @submit.prevent="handleSave">
    <div class="fr-grid-row fr-grid-row--gutters">
      <!-- DIMA Section -->
      <div class="fr-col-12 fr-col-lg-6">
        <div class="fr-mb-4w">
          <h4 class="fr-mb-2w fr-pb-1w">
            DIMA
          </h4>

          <DsfrSelect
            v-model="form.dima_duration_hours"
            class="fr-mb-3w"
            :options="durationHoursOptions"
            label="Durée d'interruption maximale"
            label-visible
            default-unselected-text="Choisir une durée"
            :disabled="!canEdit"
          />

          <DsfrCheckbox
            v-model="form.dima_is_hno"
            class="fr-mb-3w"
            label="Heure non ouvrée (HNO)"
            name="dima_is_hno"
            :value="true"
            :disabled="!canEdit"
          />

          <DsfrInput
            v-model="form.dima_business_impact"
            class="fr-mb-3w"
            label="Impact métier"
            label-visible
            type="text"
            :disabled="!canEdit"
          />

          <DsfrCheckbox
            v-model="form.dima_recovery_plan"
            class="fr-mb-3w"
            label="Plan de reprise défini"
            name="dima_recovery_plan"
            :value="true"
            :disabled="!canEdit"
          />

          <DsfrInput
            v-model="form.dima_recovery_solutions"
            class="fr-mb-3w"
            label="Solutions de reprise"
            label-visible
            is-textarea
            :disabled="!canEdit"
          />

          <DsfrInput
            v-model="form.dima_last_test_date"
            class="fr-mb-3w"
            label="Date du dernier test"
            label-visible
            type="date"
            :disabled="!canEdit"
          />

          <DsfrSelect
            v-model="form.dima_test_result"
            class="fr-mb-3w"
            :options="testResults"
            label="Résultat du test"
            label-visible
            default-unselected-text="Choisir un résultat"
            :disabled="!canEdit"
          />

          <DsfrInput
            v-model="form.dima_recovery_manager"
            class="fr-mb-3w"
            label="Responsable de la reprise"
            label-visible
            type="text"
            :disabled="!canEdit"
          />
        </div>
      </div>

      <!-- PDMA Section -->
      <div class="fr-col-12 fr-col-lg-6">
        <div class="fr-mb-4w">
          <h4 class="fr-mb-2w fr-pb-1w">
            PDMA
          </h4>

          <DsfrSelect
            v-model="form.pdma_duration_hours"
            class="fr-mb-3w"
            :options="durationHoursOptions"
            label="Durée de sauvegarde"
            label-visible
            default-unselected-text="Choisir une durée"
            :disabled="!canEdit"
          />

          <DsfrInput
            v-model="form.pdma_data_types"
            class="fr-mb-3w"
            label="Types de données"
            label-visible
            is-textarea
            :disabled="!canEdit"
          />

          <DsfrInput
            v-model="form.pdma_backup_frequency"
            class="fr-mb-3w"
            label="Fréquence de sauvegarde"
            label-visible
            type="text"
            :disabled="!canEdit"
          />

          <DsfrInput
            v-model="form.pdma_backup_method"
            class="fr-mb-3w"
            label="Méthode de sauvegarde"
            label-visible
            type="text"
            :disabled="!canEdit"
          />

          <DsfrSelect
            v-model="form.pdma_backup_storage"
            class="fr-mb-3w"
            :options="backupStorageOptions"
            label="Stockage de sauvegarde"
            label-visible
            default-unselected-text="Choisir un stockage"
            :disabled="!canEdit"
          />

          <DsfrInput
            v-model="form.pdma_last_test_date"
            class="fr-mb-3w"
            label="Date du dernier test"
            label-visible
            type="date"
            :disabled="!canEdit"
          />

          <DsfrSelect
            v-model="form.pdma_test_result"
            class="fr-mb-3w"
            :options="testResults"
            label="Résultat du test"
            label-visible
            default-unselected-text="Choisir un résultat"
            :disabled="!canEdit"
          />

          <DsfrInput
            v-model="form.pdma_restoration_manager"
            class="fr-mb-3w"
            label="Responsable de la restauration"
            label-visible
            type="text"
            :disabled="!canEdit"
          />
        </div>
      </div>

      <!-- HOMOLOGATION Section -->
      <div class="fr-col-12 fr-col-lg-6">
        <div class="fr-mb-4w">
          <h4 class="fr-mb-2w fr-pb-1w">
            Homologation
          </h4>

          <DsfrInput
            v-model="form.homologation_date"
            class="fr-mb-3w"
            label="Date d'homologation"
            label-visible
            type="date"
            :disabled="!canEdit"
          />

          <DsfrInput
            v-model="form.homologation_duration_months"
            class="fr-mb-3w"
            label="Durée en mois"
            label-visible
            type="number"
            min="0"
            :disabled="!canEdit"
          />

          <DsfrInput v-model="form.homologation_rssi_id" class="fr-mb-3w" label="ID RSSI" label-visible type="text" :disabled="!canEdit" />
        </div>
      </div>

      <!-- RGAA Section -->
      <div class="fr-col-12 fr-col-lg-6">
        <div class="fr-mb-4w">
          <h4 class="fr-mb-2w fr-pb-1w">
            RGAA
          </h4>

          <DsfrInput v-model="form.rgaa_audit_date" class="fr-mb-3w" label="Date d'audit" label-visible type="date" :disabled="!canEdit" />

          <DsfrInput
            v-model="form.rgaa_service_url"
            class="fr-mb-3w"
            label="URL du service"
            label-visible
            type="url"
            :disabled="!canEdit"
          />

          <DsfrInput
            v-model="form.rgaa_accessibility_url"
            class="fr-mb-3w"
            label="URL d'accessibilité"
            label-visible
            type="url"
            :disabled="!canEdit"
          />

          <DsfrInput
            v-model="form.rgaa_score_percentage"
            class="fr-mb-3w"
            label="Score en pourcentage"
            label-visible
            type="number"
            min="0"
            max="100"
            :disabled="!canEdit"
          />
        </div>
      </div>

      <!-- DSFR Section -->
      <div class="fr-col-12 fr-col-lg-6">
        <div class="fr-mb-4w">
          <h4 class="fr-mb-2w fr-pb-1w">
            DSFR
          </h4>

          <DsfrCheckbox
            v-model="form.dsfr_implemented"
            class="fr-mb-3w"
            label="DSFR implémenté"
            name="dsfr_implemented"
            :value="true"
            :disabled="!canEdit"
          />

          <DsfrInput v-model="form.dsfr_version" class="fr-mb-3w" label="Version DSFR" label-visible type="text" :disabled="!canEdit" />
        </div>
      </div>

      <!-- RGPD Section -->
      <div class="fr-col-12 fr-col-lg-6">
        <div class="fr-mb-4w">
          <h4 class="fr-mb-2w fr-pb-1w">
            RGPD
          </h4>

          <DsfrCheckbox
            v-model="form.rgpd_has_aipd"
            class="fr-mb-3w"
            label="AIPD réalisée"
            name="rgpd_has_aipd"
            :value="true"
            :disabled="!canEdit"
          />

          <DsfrInput v-model="form.rgpd_dpo_name" class="fr-mb-3w" label="Nom du DPO" label-visible type="text" :disabled="!canEdit" />
        </div>
      </div>
    </div>

    <div v-if="canEdit" class="fr-mt-4w">
      <DsfrButton type="submit" label="Sauvegarder les conformités" :disabled="!canEdit || isSubmitting" :loading="isSubmitting" />
    </div>
  </form>
</template>
