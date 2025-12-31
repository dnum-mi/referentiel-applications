<script lang="ts" setup>
import type { AnomalyNotificationStatus, GetAnomalyNotificationDto } from "@/client/types.gen.js";
import { statusDictionary, statusIconClasses } from "@/composables/use-dictionary";
import { useReportIssueStore } from "@/stores/reportIssueStore";
import { watch, ref } from "vue";

const props = defineProps<{
  report: GetAnomalyNotificationDto;
  isEditing: boolean;
}>();

const emit = defineEmits<{
  refresh: [];
}>();

const statusValue = ref(props.report.status);

const options: { value: AnomalyNotificationStatus; text: (typeof statusDictionary)[AnomalyNotificationStatus] }[] = [
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

const reportStore = useReportIssueStore();

async function updateStatus(newValue: AnomalyNotificationStatus) {
  try {
    if (props.report.applicationId) {
      await reportStore.updateReport(props.report.id, props.report.applicationId, newValue);
    } else {
      await reportStore.updateReport(props.report.id, "", newValue);
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
