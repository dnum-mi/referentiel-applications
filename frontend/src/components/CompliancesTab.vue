<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { ApplicationWithPerms, Compliance } from "@/models/Application";
import useToaster from "@/composables/use-toaster";
import { defineProps, defineEmits } from "vue";
import { testResultsDict, backupStorageDict, durationHoursOptions } from "@/composables/use-dictionary";
import { useUserStore } from "@/stores/userStore";
import { useComplianceStore } from "@/stores/complianceStore";

const toaster = useToaster();

const props = defineProps<{
  application: ApplicationWithPerms;
}>();

const userStore = useUserStore();
const complianceStore = useComplianceStore();
const emit = defineEmits(["update:application"]);

const loading = ref(false);
const isSubmitting = ref(false);
const canEdit = computed(
  () =>
    userStore.userPermissions?.includes("write") ||
    userStore.userPermissions?.includes("admin") ||
    props.application.myPerms.has("writeCompliances"),
);

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

const handleSave = async () => {
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
      submissionData.dima_duration_hours = parseInt(submissionData.dima_duration_hours, 10);
    }
    if (submissionData.pdma_duration_hours) {
      submissionData.pdma_duration_hours = parseInt(submissionData.pdma_duration_hours, 10);
    }
    if (submissionData.homologation_duration_months) {
      submissionData.homologation_duration_months = parseInt(submissionData.homologation_duration_months, 10);
    }
    if (submissionData.rgaa_score_percentage) {
      submissionData.rgaa_score_percentage = parseInt(submissionData.rgaa_score_percentage, 10);
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
};
</script>

<template>
  <div class="fr-grid-row fr-grid-row--middle fr-mb-3w">
    <div class="fr-col">
      <h3 class="fr-mb-0">Gestion des conformités</h3>
      <p class="fr-text--sm fr-mb-0">Configurez les différents types de conformité pour cette application.</p>
    </div>
  </div>

  <AppLoader v-if="loading" />

  <form v-else @submit.prevent="handleSave" class="compliance-form">
    <div class="fr-grid-row fr-grid-row--gutters">
      <!-- DIMA Section -->
      <div class="fr-col-12 fr-col-lg-6">
        <div class="fr-mb-4w">
          <h4 class="fr-mb-2w fr-pb-1w">DIMA</h4>

          <DsfrSelect
            class="fr-mb-3w"
            v-model="form.dima_duration_hours"
            :options="durationHoursOptions"
            label="Durée d'interruption maximale"
            label-visible
            defaultUnselectedText="Choisir une durée"
            :disabled="!canEdit"
          />

          <DsfrCheckbox
            class="fr-mb-3w"
            v-model="form.dima_is_hno"
            label="Heure non ouvrée (HNO)"
            name="dima_is_hno"
            :value="true"
            :disabled="!canEdit"
          />

          <DsfrInput
            class="fr-mb-3w"
            v-model="form.dima_business_impact"
            label="Impact métier"
            label-visible
            type="text"
            :disabled="!canEdit"
          />

          <DsfrCheckbox
            class="fr-mb-3w"
            v-model="form.dima_recovery_plan"
            label="Plan de reprise défini"
            name="dima_recovery_plan"
            :value="true"
            :disabled="!canEdit"
          />

          <DsfrInput
            class="fr-mb-3w"
            v-model="form.dima_recovery_solutions"
            label="Solutions de reprise"
            label-visible
            is-textarea
            :disabled="!canEdit"
          />

          <DsfrInput
            class="fr-mb-3w"
            v-model="form.dima_last_test_date"
            label="Date du dernier test"
            label-visible
            type="date"
            :disabled="!canEdit"
          />

          <DsfrSelect
            class="fr-mb-3w"
            v-model="form.dima_test_result"
            :options="testResults"
            label="Résultat du test"
            label-visible
            defaultUnselectedText="Choisir un résultat"
            :disabled="!canEdit"
          />

          <DsfrInput
            class="fr-mb-3w"
            v-model="form.dima_recovery_manager"
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
          <h4 class="fr-mb-2w fr-pb-1w">PDMA</h4>

          <DsfrSelect
            class="fr-mb-3w"
            v-model="form.pdma_duration_hours"
            :options="durationHoursOptions"
            label="Durée de sauvegarde"
            label-visible
            defaultUnselectedText="Choisir une durée"
            :disabled="!canEdit"
          />

          <DsfrInput
            class="fr-mb-3w"
            v-model="form.pdma_data_types"
            label="Types de données"
            label-visible
            is-textarea
            :disabled="!canEdit"
          />

          <DsfrInput
            class="fr-mb-3w"
            v-model="form.pdma_backup_frequency"
            label="Fréquence de sauvegarde"
            label-visible
            type="text"
            :disabled="!canEdit"
          />

          <DsfrInput
            class="fr-mb-3w"
            v-model="form.pdma_backup_method"
            label="Méthode de sauvegarde"
            label-visible
            type="text"
            :disabled="!canEdit"
          />

          <DsfrSelect
            class="fr-mb-3w"
            v-model="form.pdma_backup_storage"
            :options="backupStorageOptions"
            label="Stockage de sauvegarde"
            label-visible
            defaultUnselectedText="Choisir un stockage"
            :disabled="!canEdit"
          />

          <DsfrInput
            class="fr-mb-3w"
            v-model="form.pdma_last_test_date"
            label="Date du dernier test"
            label-visible
            type="date"
            :disabled="!canEdit"
          />

          <DsfrSelect
            class="fr-mb-3w"
            v-model="form.pdma_test_result"
            :options="testResults"
            label="Résultat du test"
            label-visible
            defaultUnselectedText="Choisir un résultat"
            :disabled="!canEdit"
          />

          <DsfrInput
            class="fr-mb-3w"
            v-model="form.pdma_restoration_manager"
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
          <h4 class="fr-mb-2w fr-pb-1w">Homologation</h4>

          <DsfrInput
            class="fr-mb-3w"
            v-model="form.homologation_date"
            label="Date d'homologation"
            label-visible
            type="date"
            :disabled="!canEdit"
          />

          <DsfrInput
            class="fr-mb-3w"
            v-model="form.homologation_duration_months"
            label="Durée en mois"
            label-visible
            type="number"
            min="0"
            :disabled="!canEdit"
          />

          <DsfrInput class="fr-mb-3w" v-model="form.homologation_rssi_id" label="ID RSSI" label-visible type="text" :disabled="!canEdit" />
        </div>
      </div>

      <!-- RGAA Section -->
      <div class="fr-col-12 fr-col-lg-6">
        <div class="fr-mb-4w">
          <h4 class="fr-mb-2w fr-pb-1w">RGAA</h4>

          <DsfrInput class="fr-mb-3w" v-model="form.rgaa_audit_date" label="Date d'audit" label-visible type="date" :disabled="!canEdit" />

          <DsfrInput
            class="fr-mb-3w"
            v-model="form.rgaa_service_url"
            label="URL du service"
            label-visible
            type="url"
            :disabled="!canEdit"
          />

          <DsfrInput
            class="fr-mb-3w"
            v-model="form.rgaa_accessibility_url"
            label="URL d'accessibilité"
            label-visible
            type="url"
            :disabled="!canEdit"
          />

          <DsfrInput
            class="fr-mb-3w"
            v-model="form.rgaa_score_percentage"
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
          <h4 class="fr-mb-2w fr-pb-1w">DSFR</h4>

          <DsfrCheckbox
            class="fr-mb-3w"
            v-model="form.dsfr_implemented"
            label="DSFR implémenté"
            name="dsfr_implemented"
            :value="true"
            :disabled="!canEdit"
          />

          <DsfrInput class="fr-mb-3w" v-model="form.dsfr_version" label="Version DSFR" label-visible type="text" :disabled="!canEdit" />
        </div>
      </div>

      <!-- RGPD Section -->
      <div class="fr-col-12 fr-col-lg-6">
        <div class="fr-mb-4w">
          <h4 class="fr-mb-2w fr-pb-1w">RGPD</h4>

          <DsfrCheckbox
            class="fr-mb-3w"
            v-model="form.rgpd_has_aipd"
            label="AIPD réalisée"
            name="rgpd_has_aipd"
            :value="true"
            :disabled="!canEdit"
          />

          <DsfrInput class="fr-mb-3w" v-model="form.rgpd_dpo_name" label="Nom du DPO" label-visible type="text" :disabled="!canEdit" />
        </div>
      </div>
    </div>

    <div class="fr-mt-4w" v-if="canEdit">
      <DsfrButton type="submit" label="Sauvegarder les conformités" :disabled="!canEdit || isSubmitting" :loading="isSubmitting" />
    </div>
  </form>
</template>
