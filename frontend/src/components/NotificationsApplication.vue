<script setup lang="ts">
import { useReportIssueStore } from "@/stores/reportIssueStore";
import { formatDate } from "@/composables/use-date";
import { statusDictionary, statusIconClasses } from "@/composables/use-dictionary";
import { computed, onMounted } from "vue";
import type { Application } from "@/models/Application";

const props = defineProps<{ application: Application }>();

const reportStore = useReportIssueStore();
const currentPage = ref(0);

onMounted(() => {
  reportStore.fetchIssueByApplication(props.application.id);
});

const headers = ["Notifié par", "Description", "Date de création", "Statut"];

const rows = computed(() =>
  (reportStore.issues || []).map((report: any) => [
    report.notifier.email,
    { component: "div", class: "description-cell", content: report.description },
    formatDate(report.createdAt),
    {
      component: "DsfrTag",
      icon: statusIconClasses[report.status],
      label: statusDictionary[report.status],
      class: report.status,
    },
  ]),
);

const loading = computed(() => reportStore.isLoading);
</script>

<template>
  <AppLoader v-if="loading" />
  <div v-else-if="!loading && rows.length === 0" class="text-center">
    <p>Aucune correction proposée.</p>
  </div>
  <DsfrDataTable
    v-else
    v-model:current-page="currentPage"
    :headers-row="headers"
    :rows="rows"
    row-key="id"
    title="Liste des corrections proposées"
    pagination
    :rows-per-page="5"
    :pagination-options="[5, 10, 20, 30]"
  >
    <template #cell="{ colKey, cell }">
      <template v-if="colKey === 'Statut'">
        <DsfrTag :icon="cell.icon" :class="cell.class" :label="cell.label" />
      </template>
      <template v-else-if="colKey === 'Description'">
        <div :class="cell.class">{{ cell.content }}</div>
      </template>
      <template v-else>
        {{ cell }}
      </template>
    </template>
  </DsfrDataTable>
</template>

<style scoped>
.description-cell {
  white-space: pre-wrap;
  word-wrap: break-word;
  max-width: 300px;
}
</style>
