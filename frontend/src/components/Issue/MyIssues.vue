<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { routeNames } from "@/router/route-names";
import { formatDate } from "@/composables/use-date";
import { useReportIssueStore } from "@/stores/reportIssueStore";
import { useDebouncedFn } from "@/composables/use-debouncefn";
import type { DsfrDataTableHeaderCell, DsfrDataTableRow } from "@gouvminint/vue-dsfr";
import ReportStatusTag from "./ReportStatusTag.vue";
import type { GenericRow } from "@/utils/types";

const title = "Liste de mes signalements d'applications";
const headers = [
  { key: "application", label: "Application" },
  { key: "description", label: "Description" },
  { key: "date", label: "Date" },
  { key: "status", label: "Statut" },
] as const satisfies DsfrDataTableHeaderCell[];

const reportStore = useReportIssueStore();
const selection = ref<string[]>([]);
const currentPage = ref(0);
const isLoading = ref(true);

const { run: debouncedSearch } = useDebouncedFn(() => {
  reportStore.fetchMyReports();
}, 300);

onMounted(async () => {
  isLoading.value = true;
  isLoading.value = false;
  debouncedSearch();
});

const rows = computed<DsfrDataTableRow[]>(() =>
  reportStore.userReports.map((report): GenericRow<typeof headers> => ({
    id: report.id,
    application: {
      label: report.application?.label,
      to: report.application?.id
        ? {
            name: routeNames.PROFILEAPP,
            params: { id: report.application.id },
          }
        : undefined,
    },
    description: report.description,
    date: formatDate(report.createdAt),
    status: {
      report,
    },
  })),
);
</script>

<template>
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
    pagination
    :rows-per-page="10"
    :pagination-options="[10, 20, 30, 50]"
    bottom-action-bar-class="bottom-action-bar-class"
    pagination-wrapper-class="pagination-wrapper-class"
    sorted="id"
  >
    <template #cell="{ colKey, cell }">
      <template v-if="colKey === 'application'">
        <template v-if="cell && cell.to && cell.to.params && cell.to.params.id">
          <router-link :to="cell.to" data-testid="my-issues-application-link">
            {{ cell.label || 'Voir l’application' }}
          </router-link>
        </template>
        <template v-else>
          <span data-testid="my-issues-application-link">{{ cell.label || 'Signalement global' }}</span>
        </template>
      </template>
      <template v-else-if="colKey === 'description'">
        <p class="text-wrap">
          {{ cell }}
        </p>
      </template>
      <template v-else-if="colKey === 'status'">
        <ReportStatusTag :report="cell.report" :is-editing="false" @refresh="reportStore.fetchMyReports()" />
      </template>
    </template>
  </DsfrDataTable>
</template>

<style scoped>
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

.text-wrap {
  width: auto;
  white-space: normal;
  word-wrap: break-word;
}
</style>
