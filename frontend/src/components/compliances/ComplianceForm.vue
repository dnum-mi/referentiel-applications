<script setup lang="ts">
import { ref, watch, onMounted, defineProps, defineEmits } from "vue";
import { useComplianceStore } from "@/stores/complianceStore";
import { durationHoursOptions, testResultsDict, backupStorageDict, complianceFieldLabels } from "@/composables/use-dictionary";
import { useUserStore } from "@/stores/userStore";
import type { ApplicationWithPerms } from "@/models/Application";
import { AdminLevel } from "@/models/user";

const props = defineProps<{
  applicationId: string
  application: ApplicationWithPerms
  type: string
  mode: "create" | "edit"
  initialData: Record<string, any> | null
  opened: boolean
}>();

const emit = defineEmits<{
  (e: "saved"): void
}>();

const store = useComplianceStore();
const userStore = useUserStore();
const form = ref<Record<string, any>>({});
const loading = ref(false);
const submitting = ref(false);

const canEdit = computed(
  () =>
    userStore.adminLevel >= AdminLevel.WRITE
    || props.application.myPerms.has("writeCompliances"),
);

async function loadForm() {
  loading.value = true;
  if (props.mode === "edit" && props.initialData) {
    form.value = { ...props.initialData };
  } else {
    form.value = {};
  }
  loading.value = false;
}

onMounted(loadForm);
watch(
  () => props.opened,
  open => open && loadForm(),
);
watch(
  () => props.initialData,
  () => props.opened && props.mode === "edit" && loadForm(),
);

async function save() {
  submitting.value = true;

  const schema: Record<string, { numberKeys: string[], dateKeys: string[] }> = {
    dima: {
      numberKeys: ["duration_hours"],
      dateKeys: ["last_test_date"],
    },
    pdma: {
      numberKeys: ["duration_hours"],
      dateKeys: ["last_test_date"],
    },
    homologation: {
      numberKeys: ["duration_months"],
      dateKeys: ["date"],
    },
    rgaa: {
      numberKeys: ["score_percentage"],
      dateKeys: ["audit_date"],
    },
  };

  const payload: Record<string, any> = Object.entries(form.value).reduce(
    (acc, [key, val]) => {
      acc[`${props.type}_${key}`] = val;
      return acc;
    },
    {} as Record<string, any>,
  );

  const { numberKeys = [], dateKeys = [] } = schema[props.type] || {};

  numberKeys.forEach((baseKey) => {
    const propKey = `${props.type}_${baseKey}`;
    const raw = payload[propKey];
    if (raw != null && raw !== "") {
      payload[propKey] = Number(raw);
    }
  });

  dateKeys.forEach((baseKey) => {
    const propKey = `${props.type}_${baseKey}`;
    const raw = payload[propKey];
    if (raw) {
      payload[propKey] = new Date(raw);
    }
  });

  try {
    const action = props.mode === "edit" ? store.updateCompliance : store.createCompliance;

    await action(props.applicationId, payload);
    emit("saved");
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <form @submit.prevent="save">
    <AppLoader v-if="loading" />
    <div v-else>
      <template v-if="type === 'dima'">
        <DsfrSelect
          v-model="form.duration_hours"
          :options="durationHoursOptions"
          label="Durée d'interruption maximale"
          label-visible
          required
          default-unselected-text="Choisir..."
          :disabled="!canEdit"
        />
        <DsfrCheckbox v-model="form.is_hno" :label="complianceFieldLabels.is_hno" :value="true" :disabled="!canEdit" />
        <DsfrInput v-model="form.business_impact" :label="complianceFieldLabels.business_impact" label-visible :disabled="!canEdit" />
        <DsfrCheckbox v-model="form.recovery_plan" :label="complianceFieldLabels.recovery_plan" :value="true" :disabled="!canEdit" />
        <DsfrInput
          v-model="form.recovery_solutions"
          :label="complianceFieldLabels.recovery_solutions"
          is-textarea
          label-visible
          :disabled="!canEdit"
        />
        <DsfrInput
          v-model="form.recovery_manager"
          :label="complianceFieldLabels.recovery_manager"
          label-visible
          type="text"
          :disabled="!canEdit"
        />
        <DsfrInput
          v-model="form.last_test_date"
          :label="complianceFieldLabels.last_test_date"
          type="date"
          label-visible
          :disabled="!canEdit"
        />
        <DsfrSelect
          v-model="form.test_result"
          :options="Object.entries(testResultsDict).map(([v, t]) => ({ value: v, text: t }))"
          :label="complianceFieldLabels.test_result"
          label-visible
          default-unselected-text="Choisir..."
          :disabled="!canEdit"
        />
      </template>

      <template v-else-if="type === 'pdma'">
        <DsfrSelect
          v-model="form.duration_hours"
          :options="durationHoursOptions"
          :label="complianceFieldLabels.duration_hours"
          label-visible
          default-unselected-text="Choisir..."
        />
        <DsfrInput v-model="form.data_types" :label="complianceFieldLabels.data_types" is-textarea label-visible />
        <DsfrInput v-model="form.backup_frequency" :label="complianceFieldLabels.backup_frequency" label-visible />
        <DsfrSelect
          v-model="form.backup_storage"
          :options="Object.entries(backupStorageDict).map(([v, t]) => ({ value: v, text: t }))"
          :label="complianceFieldLabels.backup_storage"
          label-visible
          default-unselected-text="Choisir..."
        />
        <DsfrInput v-model="form.last_test_date" label="Date du dernier test" type="date" label-visible />
        <DsfrSelect
          v-model="form.test_result"
          :options="Object.entries(testResultsDict).map(([v, t]) => ({ value: v, text: t }))"
          :label="complianceFieldLabels.test_result"
          label-visible
          default-unselected-text="Choisir..."
        />
        <DsfrInput v-model="form.backup_method" :label="complianceFieldLabels.backup_method" type="text" label-visible />
        <DsfrInput v-model="form.restoration_manager" :label="complianceFieldLabels.restoration_manager" type="text" label-visible />
      </template>

      <template v-else-if="type === 'homologation'">
        <DsfrInput v-model="form.date" :label="complianceFieldLabels.date" type="date" label-visible />
        <DsfrInput v-model="form.duration_months" :label="complianceFieldLabels.duration_months" type="number" min="0" label-visible />
        <DsfrInput v-model="form.rssi_id" :label="complianceFieldLabels.rssi_id" type="text" label-visible />
      </template>

      <template v-else-if="type === 'rgaa'">
        <DsfrInput v-model="form.audit_date" :label="complianceFieldLabels.audit_date" type="date" label-visible />
        <DsfrInput v-model="form.service_url" :label="complianceFieldLabels.service_url" type="url" label-visible />
        <DsfrInput v-model="form.accessibility_url" :label="complianceFieldLabels.accessibility_url" type="url" label-visible />
        <DsfrInput
          v-model="form.score_percentage"
          :label="complianceFieldLabels.score_percentage"
          type="number"
          min="0"
          max="100"
          label-visible
        />
      </template>

      <template v-else-if="type === 'dsfr'">
        <DsfrCheckbox v-model="form.implemented" :label="complianceFieldLabels.implemented" :value="true" />
        <DsfrInput v-model="form.version" :label="complianceFieldLabels.version" label-visible />
      </template>

      <template v-else-if="type === 'rgpd'">
        <DsfrCheckbox v-model="form.has_aipd" :label="complianceFieldLabels.has_aipd" :value="true" />
        <DsfrInput v-model="form.dpo_name" :label="complianceFieldLabels.dpo_name" label-visible />
      </template>
    </div>
    <div class="fr-mt-2w text-right">
      <DsfrButton type="submit" :loading="submitting" label="Enregistrer" />
    </div>
  </form>
</template>
