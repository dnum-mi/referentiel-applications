<script lang="ts" setup>
import type { ReportStatus, GetReportDto } from "@/client/types.gen.js";
import { statusDictionary, statusIconClasses } from "@/composables/use-dictionary";
import { useReportStore } from "@/stores/reportStore";
import { watch, ref } from "vue";

const props = defineProps<{
  report: GetReportDto;
  isEditing: boolean;
}>();

const emit = defineEmits<{
  refresh: [];
}>();

const statusValue = ref(props.report.status);

const options: { value: ReportStatus; text: (typeof statusDictionary)[ReportStatus] }[] = [
  {
    value: "in_pending",
    text: "En attente",
  },
  {
    value: "in_progress",
    text: "En cours",
  },
  {
    value: "done",
    text: "Terminé",
  },
];

const reportStore = useReportStore();

async function updateStatus(newValue: ReportStatus) {
  try {
    if (props.report.applicationId) {
      await reportStore.updateReport(props.report.id, props.report.applicationId, newValue, true);
    } else {
      await reportStore.updateReport(props.report.id, "", newValue, true);
    }
  } catch (err) {
    console.error("Erreur lors de la mise à jour du statut :", err);
  }
  emit("refresh");
}

watch(statusValue, (newVal, oldVal) => {
  if (newVal !== oldVal) {
    updateStatus(newVal);
  }
});
</script>

<template>
  <DsfrTag
    v-if="!isEditing"
    :icon="statusIconClasses[report.status]"
    :class="report.status"
    :label="statusDictionary[report.status]"
    :data-testid="`issues-row-${report.id}-status`"
  />
  <DsfrSelect v-else v-model="statusValue" :options="options" />
</template>

<style scoped>
.in_progress {
  color: var(--info-425-625);
  background-color: var(--info-950-100);
}

.in_pending {
  color: var(--error-425-625);
  background-color: var(--error-950-100);
}

.done {
  color: var(--success-425-625);
  background-color: var(--success-950-100);
}
</style>
