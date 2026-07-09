<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import {
  dimaDurationHoursOptions,
  pdmaDurationHoursOptions,
  testResultsDict,
  backupStorageDict,
  homologationStatusDict,
  complianceFieldLabels,
  type ComplianceType,
} from "@/constants/dictionary";
import { toDateInputValue, toISODateTime } from "@/composables/use-date";
import { useUserStore } from "@/stores/userStore";
import type { ApplicationWithPerms } from "@/models/Application";
import api from "@/api/index";
import { useToasterStore } from "@/stores/toasterStore";
import { Permission, type ComplianceDto } from "@/client/types.gen";

const props = defineProps<{
  applicationId: string;
  application: ApplicationWithPerms;
  type: ComplianceType;
  mode: "create" | "edit";
  initialData: ComplianceDto | null;
}>();

const emit = defineEmits<{
  (e: "saved", compliance: ComplianceDto): void;
}>();

const userStore = useUserStore();
const toaster = useToasterStore();
const form = ref<Partial<ComplianceDto>>({});
const submitting = ref(false);
const dimaDurationError = ref<string | undefined>(undefined);

const isHomologationHomologuee = computed(() => form.value.homologation_status === "homologuee");
const showHomologationDateEnd = computed(() => isHomologationHomologuee.value || Boolean(form.value.homologation_date_end));

const showEcoIndexUrlWarning = computed(
  () => Boolean(props.initialData?.eco_index_target_url) && form.value.eco_index_target_url !== props.initialData?.eco_index_target_url,
);

const canEdit = computed(() => userStore.hasPermissions([Permission.COMPLIANCE_WRITE], Array.from(props.application.myPerms)));

const toOptionalNumber = (value: unknown): number | undefined => (value == null || value === "" ? undefined : Number(value));
onMounted(() => {
  if (!props.initialData) {
    form.value = {};
    return;
  }

  form.value = {
    ...props.initialData,
    homologation_date_end: toDateInputValue(props.initialData.homologation_date_end),
    dima_last_test_date: toDateInputValue(props.initialData.dima_last_test_date),
  };
});

async function save() {
  if (props.type === "dima") {
    dimaDurationError.value =
      form.value.dima_duration_hours == null ? "Veuillez compléter le champ : Durée d'interruption maximale" : undefined;
    if (dimaDurationError.value) return;
  }

  submitting.value = true;
  const payload = {
    dima_duration_hours: toOptionalNumber(form.value?.dima_duration_hours),
    dima_is_hno: form.value?.dima_is_hno,
    dima_business_impact: form.value?.dima_business_impact,
    dima_recovery_plan: form.value?.dima_recovery_plan,
    dima_recovery_solutions: form.value?.dima_recovery_solutions,
    dima_recovery_manager: form.value?.dima_recovery_manager,
    dima_last_test_date: toISODateTime(form.value?.dima_last_test_date),
    dima_test_result: form.value?.dima_test_result,
    pdma_duration_hours: toOptionalNumber(form.value?.pdma_duration_hours),
    pdma_data_types: form.value?.pdma_data_types,
    pdma_backup_frequency: form.value?.pdma_backup_frequency,
    pdma_backup_storage: form.value?.pdma_backup_storage,
    pdma_last_test_date: toISODateTime(form.value?.pdma_last_test_date),
    pdma_test_result: form.value?.pdma_test_result,
    pdma_backup_method: form.value?.pdma_backup_method,
    pdma_restoration_manager: form.value?.pdma_restoration_manager,
    homologation_status: form.value?.homologation_status,
    homologation_date_end: toISODateTime(form.value?.homologation_date_end),
    dsfr_implemented: form.value?.dsfr_implemented,
    dsfr_version: form.value?.dsfr_version,
    rgpd_has_aipd: form.value?.rgpd_has_aipd,
    rgpd_dpo_name: form.value?.rgpd_dpo_name,
    eco_index_target_url: form.value?.eco_index_target_url,
  };

  try {
    const response =
      props.mode === "edit"
        ? await api.applicationCompliancesControllerUpdate({ path: { applicationId: props.applicationId }, body: payload })
        : await api.applicationCompliancesControllerCreate({ path: { applicationId: props.applicationId }, body: payload });

    if (!response.response.ok || !response.data) {
      throw new Error(
        props.mode === "edit" ? "Erreur lors de la mise à jour de la conformité." : "Erreur lors de la création de la conformité.",
      );
    }

    toaster.addSuccessMessage(props.mode === "edit" ? "Conformité mise à jour avec succès !" : "Conformité créée avec succès !");

    emit("saved", response.data as ComplianceDto);
  } catch {
    toaster.addErrorMessage(
      props.mode === "edit" ? "Erreur lors de la modification de la conformité." : "Erreur lors de la création de la conformité.",
    );
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <form data-testid="compliance-form" @submit.prevent="save">
    <AppLoader v-if="submitting" data-testid="compliance-loader" />
    <div v-else>
      <template v-if="type === 'dima'">
        <DsfrSelect
          :model-value="form.dima_duration_hours"
          @update:model-value="($event) => (form.dima_duration_hours = toOptionalNumber($event))"
          :options="dimaDurationHoursOptions"
          label="Durée d'interruption maximale"
          label-visible
          required
          default-unselected-text="Choisir..."
          :disabled="!canEdit"
          :error-message="dimaDurationError"
          data-testid="compliance-dima-duration"
        />
        <DsfrCheckbox
          v-model="form.dima_is_hno"
          name="dima_is_hno"
          :label="complianceFieldLabels.is_hno"
          :value="true"
          :disabled="!canEdit"
          data-testid="compliance-dima-hno"
        />
        <DsfrInput
          v-model="form.dima_business_impact"
          :label="complianceFieldLabels.business_impact"
          label-visible
          :disabled="!canEdit"
          data-testid="compliance-dima-business-impact"
        />
        <DsfrCheckbox
          v-model="form.dima_recovery_plan"
          name="dima_recovery_plan"
          :label="complianceFieldLabels.recovery_plan"
          :value="true"
          :disabled="!canEdit"
          data-testid="compliance-dima-recovery-plan"
        />
        <DsfrInput
          v-model="form.dima_recovery_solutions"
          :label="complianceFieldLabels.recovery_solutions"
          is-textarea
          label-visible
          :disabled="!canEdit"
          data-testid="compliance-dima-recovery-solutions"
        />
        <DsfrInput
          v-model="form.dima_recovery_manager"
          :label="complianceFieldLabels.recovery_manager"
          label-visible
          type="text"
          :disabled="!canEdit"
          data-testid="compliance-dima-recovery-manager"
        />
        <DsfrInput
          v-model="form.dima_last_test_date"
          :label="complianceFieldLabels.last_test_date"
          type="date"
          label-visible
          :disabled="!canEdit"
          data-testid="compliance-dima-last-test-date"
        />
        <DsfrSelect
          v-model="form.dima_test_result"
          :options="Object.entries(testResultsDict).map(([v, t]) => ({ value: v, text: t }))"
          :label="complianceFieldLabels.test_result"
          label-visible
          default-unselected-text="Choisir..."
          :disabled="!canEdit"
          data-testid="compliance-dima-test-result"
        />
      </template>

      <template v-else-if="type === 'pdma'">
        <DsfrSelect
          :model-value="form.pdma_duration_hours"
          @update:model-value="($event) => (form.pdma_duration_hours = toOptionalNumber($event))"
          :options="pdmaDurationHoursOptions"
          :label="complianceFieldLabels.duration_hours"
          label-visible
          default-unselected-text="Choisir..."
          data-testid="compliance-pdma-duration"
        />
        <DsfrInput
          v-model="form.pdma_data_types"
          :label="complianceFieldLabels.data_types"
          is-textarea
          label-visible
          data-testid="compliance-pdma-data-types"
        />
        <DsfrInput
          v-model="form.pdma_backup_frequency"
          :label="complianceFieldLabels.backup_frequency"
          label-visible
          data-testid="compliance-pdma-backup-frequency"
        />
        <DsfrSelect
          v-model="form.pdma_backup_storage"
          :options="Object.entries(backupStorageDict).map(([v, t]) => ({ value: v, text: t }))"
          :label="complianceFieldLabels.backup_storage"
          label-visible
          default-unselected-text="Choisir..."
          data-testid="compliance-pdma-backup-storage"
        />
        <DsfrInput
          v-model="form.pdma_last_test_date"
          label="Date du dernier test"
          type="date"
          label-visible
          data-testid="compliance-pdma-last-test-date"
        />
        <DsfrSelect
          v-model="form.pdma_test_result"
          :options="Object.entries(testResultsDict).map(([v, t]) => ({ value: v, text: t }))"
          :label="complianceFieldLabels.test_result"
          label-visible
          default-unselected-text="Choisir..."
          data-testid="compliance-pdma-test-result"
        />
        <DsfrInput
          v-model="form.pdma_backup_method"
          :label="complianceFieldLabels.backup_method"
          type="text"
          label-visible
          data-testid="compliance-pdma-backup-method"
        />
        <DsfrInput
          v-model="form.pdma_restoration_manager"
          :label="complianceFieldLabels.restoration_manager"
          type="text"
          label-visible
          data-testid="compliance-pdma-restoration-manager"
        />
      </template>

      <template v-else-if="type === 'homologation'">
        <DsfrSelect
          v-model="form.homologation_status"
          :options="Object.entries(homologationStatusDict).map(([v, t]) => ({ value: v, text: t }))"
          :label="complianceFieldLabels.status"
          label-visible
          default-unselected-text="Choisir..."
          :disabled="!canEdit"
          data-testid="compliance-homologation-status"
        />
        <DsfrInput
          v-if="showHomologationDateEnd || isHomologationHomologuee"
          v-model="form.homologation_date_end"
          :label="complianceFieldLabels.date_end"
          type="date"
          label-visible
          :disabled="!canEdit"
          hint="Date de fin d'homologation"
          data-testid="compliance-homologation-date-end"
        />
      </template>

      <template v-else-if="type === 'dsfr'">
        <DsfrCheckbox
          v-model="form.dsfr_implemented"
          name="dsfr_implemented"
          :label="complianceFieldLabels.implemented"
          :value="true"
          data-testid="compliance-dsfr-implemented"
        />
        <DsfrInput v-model="form.dsfr_version" :label="complianceFieldLabels.version" label-visible data-testid="compliance-dsfr-version" />
      </template>

      <template v-else-if="type === 'rgpd'">
        <DsfrCheckbox
          v-model="form.rgpd_has_aipd"
          name="rgpd_has_aipd"
          :label="complianceFieldLabels.has_aipd"
          :value="true"
          data-testid="compliance-rgpd-aipd"
        />
        <DsfrInput v-model="form.rgpd_dpo_name" :label="complianceFieldLabels.dpo_name" label-visible data-testid="compliance-rgpd-dpo" />
      </template>

      <template v-else-if="type === 'eco_index'">
        <DsfrInput
          v-model="form.eco_index_target_url"
          :label="complianceFieldLabels.eco_index_target_url"
          label-visible
          type="url"
          data-testid="ecoindex-target-url-input"
        />
        <DsfrAlert
          v-if="showEcoIndexUrlWarning"
          type="warning"
          title="Attention"
          description="Modifier l'URL réinitialisera les valeurs de l'éco-index."
          class="fr-mt-2w"
        />
      </template>
    </div>
    <div class="fr-mt-2w text-right">
      <DsfrButton type="submit" :loading="submitting" label="Enregistrer" data-testid="compliance-submit-btn" />
    </div>
  </form>
</template>
