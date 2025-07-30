<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { defineProps, defineEmits } from "vue";
import { useComplianceStore } from "@/stores/complianceStore";
import { durationHoursOptions, testResultsDict, backupStorageDict } from "@/composables/use-dictionary";

const props = defineProps<{
  applicationId: string;
  type: string;
  mode: "create" | "edit";
  initialData: Record<string, any> | null;
  opened: boolean;
}>();

const emit = defineEmits<{
  (e: "saved"): void;
}>();

const store = useComplianceStore();
const form = ref<Record<string, any>>({});
const loading = ref(false);
const submitting = ref(false);

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
  (open) => open && loadForm(),
);
watch(
  () => props.initialData,
  () => props.opened && props.mode === "edit" && loadForm(),
);

async function save() {
  submitting.value = true;

  const schema: Record<string, { numberKeys: string[]; dateKeys: string[] }> = {
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
          defaultUnselectedText="Choisir..."
        />
        <DsfrCheckbox v-model="form.is_hno" label="Heure non ouvrée" :value="true" />
        <DsfrInput v-model="form.business_impact" label="Impact métier" label-visible />
        <DsfrCheckbox v-model="form.recovery_plan" label="Plan de reprise défini" :value="true" />
        <DsfrInput v-model="form.recovery_solutions" label="Solutions de reprise" is-textarea label-visible />
        <DsfrInput v-model="form.recovery_manager" label="Responsable de la reprise" label-visible type="text" />
        <DsfrInput v-model="form.last_test_date" label="Date du dernier test" type="date" label-visible />
        <DsfrSelect
          v-model="form.test_result"
          :options="Object.entries(testResultsDict).map(([v, t]) => ({ value: v, text: t }))"
          label="Résultat du test"
          label-visible
          defaultUnselectedText="Choisir..."
        />
      </template>

      <template v-else-if="type === 'pdma'">
        <DsfrSelect
          v-model="form.duration_hours"
          :options="durationHoursOptions"
          label="Durée de sauvegarde"
          label-visible
          defaultUnselectedText="Choisir..."
        />
        <DsfrInput v-model="form.data_types" label="Types de données" is-textarea label-visible />
        <DsfrInput v-model="form.backup_frequency" label="Fréquence de sauvegarde" label-visible />
        <DsfrSelect
          v-model="form.backup_storage"
          :options="Object.entries(backupStorageDict).map(([v, t]) => ({ value: v, text: t }))"
          label="Stockage de sauvegarde"
          label-visible
          defaultUnselectedText="Choisir..."
        />
        <DsfrInput v-model="form.last_test_date" label="Date du dernier test" type="date" label-visible />
        <DsfrSelect
          v-model="form.test_result"
          :options="Object.entries(testResultsDict).map(([v, t]) => ({ value: v, text: t }))"
          label="Résultat du test"
          label-visible
          defaultUnselectedText="Choisir..."
        />
        <DsfrInput v-model="form.backup_method" label="Méthode de sauvegarde" type="text" label-visible />
        <DsfrInput v-model="form.restoration_manager" label="Responsable de la restauration" type="text" label-visible />
      </template>

      <template v-else-if="type === 'homologation'">
        <DsfrInput v-model="form.date" label="Date d'homologation" type="date" label-visible />
        <DsfrInput v-model="form.duration_months" label="Durée (mois)" type="number" min="0" label-visible />
        <DsfrInput v-model="form.rssi_id" label="ID RSSI" type="text" label-visible />
      </template>

      <template v-else-if="type === 'rgaa'">
        <DsfrInput v-model="form.audit_date" label="Date d'audit" type="date" label-visible />
        <DsfrInput v-model="form.service_url" label="URL du service" type="url" label-visible />
        <DsfrInput v-model="form.accessibility_url" label="URL d'accessibilité" type="url" label-visible />
        <DsfrInput v-model="form.score_percentage" label="Score (%)" type="number" min="0" max="100" label-visible />
      </template>

      <template v-else-if="type === 'dsfr'">
        <DsfrCheckbox v-model="form.implemented" label="DSFR implémenté" :value="true" />
        <DsfrInput v-model="form.version" label="Version DSFR" label-visible />
      </template>

      <template v-else-if="type === 'rgpd'">
        <DsfrCheckbox v-model="form.has_aipd" label="AIPD réalisée" :value="true" />
        <DsfrInput v-model="form.dpo_name" label="Nom du DPO" label-visible />
      </template>
    </div>
    <div class="fr-mt-2w text-right">
      <DsfrButton type="submit" :loading="submitting" label="Enregistrer" />
    </div>
  </form>
</template>
