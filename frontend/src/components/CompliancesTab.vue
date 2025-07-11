<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import type { Compliance } from "@/models/Application";
import useToaster from "@/composables/use-toaster";
import { defineProps, defineEmits } from "vue";
import { testResultsDict, backupStorageDict, durationHoursOptions } from "@/composables/use-dictionary";
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
const emit = defineEmits(["update:application"]);

const loading = ref(false);
const isSubmitting = ref(false);

const form = ref<Partial<Compliance>>({});

// Computed options for dropdowns
const testResults = computed(() => Object.entries(testResultsDict).map(([value, text]) => ({ value, text })));

const backupStorageOptions = computed(() => Object.entries(backupStorageDict).map(([value, text]) => ({ value, text })));

const fetchCompliance = async () => {
  loading.value = true;
  try {
    const compliance = await CompliancesApi.getCompliance(props.application.id);
    form.value = {
      ...compliance,
      // Convert date fields to proper format for date inputs, only if they exist
      dima_last_test_date: compliance.dima_last_test_date?.split("T")[0] || undefined,
      pdma_last_test_date: compliance.pdma_last_test_date?.split("T")[0] || undefined,
      homologation_date: compliance.homologation_date?.split("T")[0] || undefined,
      rgaa_audit_date: compliance.rgaa_audit_date?.split("T")[0] || undefined,
    };
  } catch (error) {
    console.error("Error fetching compliance:", error);
    form.value = {};
  } finally {
    loading.value = false;
  }
};

const handleSave = async () => {
  if (!userStore.userPermissions.includes("write")) {
    toaster.addErrorMessage("Vous n'avez pas les permissions pour modifier les conformités.");
    return;
  }

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
      await CompliancesApi.updateCompliance(props.application.id, submissionData);
      toaster.addSuccessMessage("Conformité mise à jour avec succès !");
    } else {
      // Create new compliance
      await CompliancesApi.createCompliance(props.application.id, submissionData);
      toaster.addSuccessMessage("Conformité créée avec succès !");
    }

    await fetchCompliance();
    emit("update:application", props.application);
  } catch (_error) {
    toaster.addErrorMessage("Erreur lors de la sauvegarde de la conformité.");
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(() => {
  fetchCompliance();
});
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
          />

          <DsfrCheckbox class="fr-mb-3w" v-model="form.dima_is_hno" label="Heure non ouvrée (HNO)" name="dima_is_hno" :value="true" />

          <DsfrInput class="fr-mb-3w" v-model="form.dima_business_impact" label="Impact métier" label-visible type="text" />

          <DsfrCheckbox
            class="fr-mb-3w"
            v-model="form.dima_recovery_plan"
            label="Plan de reprise défini"
            name="dima_recovery_plan"
            :value="true"
          />

          <DsfrInput class="fr-mb-3w" v-model="form.dima_recovery_solutions" label="Solutions de reprise" label-visible is-textarea />

          <DsfrInput class="fr-mb-3w" v-model="form.dima_last_test_date" label="Date du dernier test" label-visible type="date" />

          <DsfrSelect
            class="fr-mb-3w"
            v-model="form.dima_test_result"
            :options="testResults"
            label="Résultat du test"
            label-visible
            defaultUnselectedText="Choisir un résultat"
          />

          <DsfrInput class="fr-mb-3w" v-model="form.dima_recovery_manager" label="Responsable de la reprise" label-visible type="text" />
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
          />

          <DsfrInput class="fr-mb-3w" v-model="form.pdma_data_types" label="Types de données" label-visible is-textarea />

          <DsfrInput class="fr-mb-3w" v-model="form.pdma_backup_frequency" label="Fréquence de sauvegarde" label-visible type="text" />

          <DsfrInput class="fr-mb-3w" v-model="form.pdma_backup_method" label="Méthode de sauvegarde" label-visible type="text" />

          <DsfrSelect
            class="fr-mb-3w"
            v-model="form.pdma_backup_storage"
            :options="backupStorageOptions"
            label="Stockage de sauvegarde"
            label-visible
            defaultUnselectedText="Choisir un stockage"
          />

          <DsfrInput class="fr-mb-3w" v-model="form.pdma_last_test_date" label="Date du dernier test" label-visible type="date" />

          <DsfrSelect
            class="fr-mb-3w"
            v-model="form.pdma_test_result"
            :options="testResults"
            label="Résultat du test"
            label-visible
            defaultUnselectedText="Choisir un résultat"
          />

          <DsfrInput
            class="fr-mb-3w"
            v-model="form.pdma_restoration_manager"
            label="Responsable de la restauration"
            label-visible
            type="text"
          />
        </div>
      </div>

      <!-- HOMOLOGATION Section -->
      <div class="fr-col-12 fr-col-lg-6">
        <div class="fr-mb-4w">
          <h4 class="fr-mb-2w fr-pb-1w">Homologation</h4>

          <DsfrInput class="fr-mb-3w" v-model="form.homologation_date" label="Date d'homologation" label-visible type="date" />

          <DsfrInput
            class="fr-mb-3w"
            v-model="form.homologation_duration_months"
            label="Durée en mois"
            label-visible
            type="number"
            min="0"
          />

          <DsfrInput class="fr-mb-3w" v-model="form.homologation_rssi_id" label="ID RSSI" label-visible type="text" />
        </div>
      </div>

      <!-- RGAA Section -->
      <div class="fr-col-12 fr-col-lg-6">
        <div class="fr-mb-4w">
          <h4 class="fr-mb-2w fr-pb-1w">RGAA</h4>

          <DsfrInput class="fr-mb-3w" v-model="form.rgaa_audit_date" label="Date d'audit" label-visible type="date" />

          <DsfrInput class="fr-mb-3w" v-model="form.rgaa_service_url" label="URL du service" label-visible type="url" />

          <DsfrInput class="fr-mb-3w" v-model="form.rgaa_accessibility_url" label="URL d'accessibilité" label-visible type="url" />

          <DsfrInput
            class="fr-mb-3w"
            v-model="form.rgaa_score_percentage"
            label="Score en pourcentage"
            label-visible
            type="number"
            min="0"
            max="100"
          />
        </div>
      </div>

      <!-- DSFR Section -->
      <div class="fr-col-12 fr-col-lg-6">
        <div class="fr-mb-4w">
          <h4 class="fr-mb-2w fr-pb-1w">DSFR</h4>

          <DsfrCheckbox class="fr-mb-3w" v-model="form.dsfr_implemented" label="DSFR implémenté" name="dsfr_implemented" :value="true" />

          <DsfrInput class="fr-mb-3w" v-model="form.dsfr_version" label="Version DSFR" label-visible type="text" />
        </div>
      </div>

      <!-- RGPD Section -->
      <div class="fr-col-12 fr-col-lg-6">
        <div class="fr-mb-4w">
          <h4 class="fr-mb-2w fr-pb-1w">RGPD</h4>

          <DsfrCheckbox class="fr-mb-3w" v-model="form.rgpd_has_aipd" label="AIPD réalisée" name="rgpd_has_aipd" :value="true" />

          <DsfrInput class="fr-mb-3w" v-model="form.rgpd_dpo_name" label="Nom du DPO" label-visible type="text" />
        </div>
      </div>
    </div>

    <div class="fr-mt-4w">
      <DsfrButton
        type="submit"
        label="Sauvegarder les conformités"
        :disabled="!userStore.userPermissions.includes('write') || isSubmitting"
        :loading="isSubmitting"
      />
    </div>
  </form>
</template>
