<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { routeNames } from "@/router/route-names";
import { formatDate } from "@/composables/use-date";
import { statusDictionary, statusIconClasses } from "@/composables/use-dictionary";
import { useReportIssueStore } from "@/stores/reportIssueStore";

const title = "Liste de mes corrections d'applications";
const headers = ["Application", "Description", "Date", "Statut"];
type Status = "in_pending" | "in_progress" | "done";

const reportStore = useReportIssueStore();
const selection = ref<string[]>([]);
const currentPage = ref(0);
const isLoading = ref(true);

onMounted(async () => {
  isLoading.value = true;
  await reportStore.fetchMyReports();
  isLoading.value = false;
});

const rows = computed(() =>
  reportStore.userReports.map(report => ({
    Application: {
      label: report.application?.label,
      to: {
        name: routeNames.PROFILEAPP,
        params: { id: report.application?.id },
      },
    },
    Description: report.description,
    Date: formatDate(report.createdAt),
    Statut: {
      component: "DsfrTag",
      icon: statusIconClasses[report.status as Status],
      label: statusDictionary[report.status as Status],
      class: report.status,
    },
  })),
);
</script>

<template>
  <div class="fr-container fr-my-2v w-[800px]">
    <AppLoader v-if="isLoading" data-testid="my-issues-loader" />
    <div v-else-if="!rows.length" class="text-center" data-testid="my-issues-empty">
      <p>Aucune correction recensée.</p>
    </div>
    <DsfrDataTable
      v-else
      v-model:selection="selection"
      v-model:current-page="currentPage"
      data-testid="my-issues-table"
      :headers-row="headers"
      :rows="rows"
      row-key="id"
      :title="title"
      selectable-rows
      pagination
      :rows-per-page="10"
      :pagination-options="[10, 20, 30]"
      bottom-action-bar-class="bottom-action-bar-class"
      pagination-wrapper-class="pagination-wrapper-class"
      sorted="id"
      :sortable-rows="['id']"
    >
      <template #cell="{ colKey, cell }">
        <template v-if="colKey === 'Application'">
          <router-link :to="cell.to" data-testid="my-issues-application-link">
            {{ cell.label }}
          </router-link>
        </template>
        <template v-else-if="colKey === 'Statut'">
          <DsfrTag :icon="cell.icon" :class="cell.class" :label="cell.label" data-testid="my-issues-status-tag" />
        </template>
        <template v-else>
          {{ cell }}
        </template>
      </template>
    </DsfrDataTable>
  </div>
</template>

<style scoped>
:deep(.in_progress) {
  color: var(--info-425-625);
  background-color: var(--info-950-100);
}

:deep(.in_pending) {
  color: var(--error-425-625);
  background-color: var(--error-950-100);
}

:deep(.done) {
  color: var(--success-425-625);
  background-color: var(--success-950-100);
}

.text-center {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #555;
  font-size: 1.2rem;
  font-weight: 500;
  background-color: #f9f9f9;
  border: 1px dashed #ccc;
  border-radius: 8px;
  padding: 20px;
  margin: 20px auto;
  width: 80%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
</style>
