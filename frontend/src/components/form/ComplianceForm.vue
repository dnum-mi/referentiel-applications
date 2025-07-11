<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { Compliance } from "@/models/Application";
import { defineProps, defineEmits } from "vue";
import type { PropType } from "vue";
import { complianceTypesDict, testResultsDict, backupStorageDict, durationHoursOptions } from "@/composables/use-dictionary";

const props = defineProps({
  initialData: {
    type: Object as PropType<Compliance & { selectedType?: string }>,
    required: false,
  },
  isSubmitting: {
    type: Boolean,
    required: false,
  },
});

// If selectedType is provided, use it; otherwise try to detect from data
const selectedType = ref(props.initialData?.selectedType || "");

const complianceTypes = computed(() => [
  { value: "", text: "Choisir un type de conformité" },
  ...Object.entries(complianceTypesDict).map(([value, text]) => ({ value, text })),
]);

const testResults = computed(() => [
  { value: "", text: "Choisir un résultat" },
  ...Object.entries(testResultsDict).map(([value, text]) => ({ value, text })),
]);

const backupStorageOptions = computed(() => [
  { value: "", text: "Choisir un stockage" },
  ...Object.entries(backupStorageDict).map(([value, text]) => ({ value, text })),
]);

const form = ref({
  ...props.initialData,
  // Convert date fields to proper format for date inputs
  dima_last_test_date: props.initialData?.dima_last_test_date?.split("T")[0] || undefined,
  pdma_last_test_date: props.initialData?.pdma_last_test_date?.split("T")[0] || undefined,
  homologation_date: props.initialData?.homologation_date?.split("T")[0] || undefined,
  rgaa_audit_date: props.initialData?.rgaa_audit_date?.split("T")[0] || undefined,
});

// Watch for selectedType changes to show/hide fields
watch(selectedType, (newType) => {
  if (newType) {
    // When type changes, keep only fields relevant to that type
    // This ensures the form only shows fields for the selected compliance type
  }
});

const emit = defineEmits(["update:application", "submit", "cancel"]);

const handleSubmit = () => {
  // Since we're now working with a single compliance object that contains all fields,
  // we don't need to clean up fields - just submit the form data as is
  const submissionData = { ...form.value };

  // Remove UI-only fields
  delete submissionData.selectedType;

  emit("submit", submissionData);
};

// Watch for type changes to reset form
watch(
  () => form.value.type,
  (newType, oldType) => {
    if (newType !== oldType && oldType) {
      // Reset all type-specific fields when changing type
      form.value = {
        ...form.value,
        type: newType,
        // Reset all type-specific fields
        dima_duration_hours: undefined,
        dima_is_hno: undefined,
        dima_business_impact: undefined,
        dima_recovery_plan: undefined,
        dima_recovery_solutions: undefined,
        dima_last_test_date: undefined,
        dima_test_result: undefined,
        dima_recovery_manager: undefined,
        pdma_duration_hours: undefined,
        pdma_data_types: undefined,
        pdma_backup_frequency: undefined,
        pdma_backup_method: undefined,
        pdma_backup_storage: undefined,
        pdma_last_test_date: undefined,
        pdma_test_result: undefined,
        pdma_restoration_manager: undefined,
        homologation_date: undefined,
        homologation_duration_months: undefined,
        homologation_rssi_id: undefined,
        rgaa_audit_date: undefined,
        rgaa_service_url: undefined,
        rgaa_accessibility_url: undefined,
        rgaa_score_percentage: undefined,
        dsfr_implemented: undefined,
        dsfr_version: undefined,
        rgpd_has_aipd: undefined,
        rgpd_dpo_name: undefined,
      };
    }
  },
);
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <!-- Compliance Type Selection -->
    <DsfrSelect
      class="fr-mb-3w"
      v-model="selectedType"
      :options="complianceTypes"
      label="Type de conformité"
      label-visible
      required
      :disabled="!!props.initialData?.selectedType"
    />

    <DsfrAlert
      v-if="props.initialData?.selectedType"
      type="info"
      class="fr-mb-3w"
      :description="`Configuration de la conformité ${complianceTypesDict[selectedType as keyof typeof complianceTypesDict]}`"
    />

    <!-- DIMA Fields -->
    <template v-if="selectedType === 'DIMA'">
      <h3 class="fr-h6 fr-mb-2w">Configuration DIMA</h3>

      <DsfrSelect
        class="fr-mb-3w"
        v-model="form.dima_duration_hours"
        :options="durationHoursOptions"
        label="Durée d'interruption maximale (obligatoire)"
        label-visible
        required
      />

      <DsfrCheckbox class="fr-mb-3w" v-model="form.dima_is_hno" label="HNO (Heure non ouvrée)" />

      <DsfrInput class="fr-mb-3w" v-model="form.dima_business_impact" label="Impact métier de l'interruption" label-visible is-textarea />

      <DsfrCheckbox
        class="fr-mb-3w"
        v-model="form.dima_recovery_plan"
        name="dima_recovery_plan"
        value="true"
        label="Plan de reprise existant (obligatoire)"
        required
      />

      <DsfrInput class="fr-mb-3w" v-model="form.dima_recovery_solutions" label="Solutions de reprise" label-visible is-textarea />

      <DsfrInput class="fr-mb-3w" v-model="form.dima_last_test_date" label="Date du dernier test de reprise" type="date" label-visible />

      <DsfrSelect
        class="fr-mb-3w"
        v-model="form.dima_test_result"
        :options="testResults"
        label="Résultat du test de reprise"
        label-visible
      />

      <DsfrInput
        class="fr-mb-3w"
        v-model="form.dima_recovery_manager"
        label="Responsable de la reprise (obligatoire)"
        label-visible
        required
      />
    </template>

    <!-- PDMA Fields -->
    <template v-if="selectedType === 'PDMA'">
      <h3 class="fr-h6 fr-mb-2w">Configuration PDMA</h3>

      <DsfrSelect
        class="fr-mb-3w"
        v-model="form.pdma_duration_hours"
        :options="durationHoursOptions"
        label="Durée maximale de perte de données (obligatoire)"
        label-visible
        required
      />

      <DsfrInput class="fr-mb-3w" v-model="form.pdma_data_types" label="Types de données concernées" label-visible is-textarea />

      <DsfrInput class="fr-mb-3w" v-model="form.pdma_backup_frequency" label="Fréquence de sauvegarde" label-visible />

      <DsfrInput class="fr-mb-3w" v-model="form.pdma_backup_method" label="Méthode de sauvegarde utilisée" label-visible is-textarea />

      <DsfrSelect
        class="fr-mb-3w"
        v-model="form.pdma_backup_storage"
        :options="backupStorageOptions"
        label="Stockage des sauvegardes (obligatoire)"
        label-visible
        required
      />

      <DsfrInput
        class="fr-mb-3w"
        v-model="form.pdma_last_test_date"
        label="Date du dernier test de restauration"
        type="date"
        label-visible
      />

      <DsfrSelect
        class="fr-mb-3w"
        v-model="form.pdma_test_result"
        :options="testResults"
        label="Résultat du test de restauration"
        label-visible
      />

      <DsfrInput
        class="fr-mb-3w"
        v-model="form.pdma_restoration_manager"
        label="Responsable de la restauration (obligatoire)"
        label-visible
        required
      />
    </template>

    <!-- Homologation Fields -->
    <template v-if="selectedType === 'HOMOLOGATION'">
      <h3 class="fr-h6 fr-mb-2w">Configuration Homologation</h3>

      <DsfrInput
        class="fr-mb-3w"
        v-model="form.homologation_date"
        label="Date de l'homologation (obligatoire)"
        type="date"
        label-visible
        required
      />

      <DsfrInput
        class="fr-mb-3w"
        v-model="form.homologation_duration_months"
        label="Durée de l'homologation en mois (obligatoire)"
        type="number"
        label-visible
        required
      />

      <DsfrInput
        class="fr-mb-3w"
        v-model="form.homologation_rssi_id"
        label="RSSI (obligatoire)"
        label-visible
        required
        hint="ID de l'acteur RSSI"
      />
    </template>

    <!-- RGAA Fields -->
    <template v-if="selectedType === 'RGAA'">
      <h3 class="fr-h6 fr-mb-2w">Configuration RGAA</h3>

      <DsfrInput
        class="fr-mb-3w"
        v-model="form.rgaa_audit_date"
        label="Date d'audit du RGAA (obligatoire)"
        type="date"
        label-visible
        required
      />

      <DsfrInput class="fr-mb-3w" v-model="form.rgaa_service_url" label="URL du service applicatif" type="url" label-visible />

      <DsfrInput class="fr-mb-3w" v-model="form.rgaa_accessibility_url" label="URL de la page d'accessibilité" type="url" label-visible />

      <DsfrInput
        class="fr-mb-3w"
        v-model="form.rgaa_score_percentage"
        label="Score obtenu lors de l'audit en % (obligatoire)"
        type="number"
        min="0"
        max="100"
        label-visible
        required
      />
    </template>

    <!-- DSFR Fields -->
    <template v-if="selectedType === 'DSFR'">
      <h3 class="fr-h6 fr-mb-2w">Configuration DSFR</h3>

      <DsfrCheckbox class="fr-mb-3w" v-model="form.dsfr_implemented" label="DSFR implémenté (obligatoire)" required />

      <DsfrInput class="fr-mb-3w" v-model="form.dsfr_version" label="Version de DSFR utilisée (obligatoire)" label-visible required />
    </template>

    <!-- RGPD Fields -->
    <template v-if="selectedType === 'RGPD'">
      <h3 class="fr-h6 fr-mb-2w">Configuration RGPD</h3>

      <DsfrCheckbox class="fr-mb-3w" v-model="form.rgpd_has_aipd" label="Existe-t-il une AIPD ? (obligatoire)" required />

      <DsfrInput class="fr-mb-3w" v-model="form.rgpd_dpo_name" label="Nom du DPO délégué (obligatoire)" label-visible required />
    </template>

    <div class="fr-btns-group fr-btns-group--right fr-mt-4w">
      <DsfrButton type="button" secondary label="Annuler" @click="$emit('cancel')" />
      <DsfrButton type="submit" :disabled="isSubmitting" :label="isSubmitting ? 'Enregistrement...' : 'Enregistrer'">
        <template v-if="isSubmitting">
          <span class="fr-loading fr-loading--sm">
            <span class="fr-loading__icon" aria-hidden="true"></span>
          </span>
        </template>
      </DsfrButton>
    </div>
  </form>
</template>
