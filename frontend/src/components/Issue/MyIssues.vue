<script setup lang="ts">
import { onMounted, ref, computed, watch } from "vue";
import { routeNames } from "@/router/route-names";
import { formatDate } from "@/composables/use-date";
import { useDebouncedFn } from "@/composables/use-debouncefn";
import type { DsfrDataTableHeaderCell } from "@gouvminint/vue-dsfr";
import PaginationFooter from "../PaginationFooter.vue";
import ReportStatusTag from "./ReportStatusTag.vue";
import api from "@/api";
import type { AnomalyNotificationPaginatedResponseDto, AnomalyNotificationDto } from "@/client/types.gen";

const title = "Liste de mes signalements d'applications";
const headers = [
  { key: "application", label: "Application" },
  { key: "description", label: "Description" },
  { key: "date", label: "Date" },
  { key: "status", label: "Statut" },
] as const satisfies DsfrDataTableHeaderCell[];


const selection = ref<string[]>([]);
const currentPage = ref(0);
const itemsPerPage = ref(15);
const isLoading = ref(true);
const data = ref<AnomalyNotificationPaginatedResponseDto>({ results: [], total: 0 });

const fetchMyReports = async () => {
  isLoading.value = true;
  try {
    const query = {
      page: currentPage.value,
      limit: itemsPerPage.value,
    };
    const response = await api.anomalyNotificationsControllerFindAll({ query });
    data.value = response.data as AnomalyNotificationPaginatedResponseDto;
  } finally {
    isLoading.value = false;
  }
};

const { run: debouncedSearch } = useDebouncedFn(fetchMyReports, 300);

watch([currentPage, itemsPerPage], () => {
  debouncedSearch();
});

onMounted(async () => {
  await fetchMyReports();
});

const rows = computed(() =>
  (data.value.results || []).map((report: AnomalyNotificationDto) => ({
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
  }))
);
</script>

<template>
  <AppLoader v-if="isLoading" data-testid="my-issues-loader" />
  <DsfrDataTable
    v-else
    v-model:selection="selection"
    data-testid="my-issues-table"
    :headers-row="headers"
    :rows="rows"
    row-key="id"
    :title="title"
    :sortable-rows="true"
  >
    <template #cell="{ colKey, cell }">
      <template v-if="colKey === 'application'">
        <template v-if="cell && (cell as any).to && (cell as any).to.params && (cell as any).to.params.id">
          <router-link :to="(cell as any).to" data-testid="my-issues-application-link">
            {{ (cell as any).label || 'Voir l’application' }}
          </router-link>
        </template>
        <template v-else>
          <span data-testid="my-issues-application-link">{{ (cell as any).label || 'Signalement global' }}</span>
        </template>
      </template>
      <template v-else-if="colKey === 'description'">
        <p class="text-wrap">
          {{ cell }}
        </p>
      </template>
      <template v-else-if="colKey === 'status'">
        <ReportStatusTag :report="(cell as any).report" :is-editing="false" @refresh="fetchMyReports" />
      </template>
    </template>
  </DsfrDataTable>
  <PaginationFooter
    :total-filtered="data.total"
    :limit="itemsPerPage"
    :page="currentPage"
    @update:limit="val => { itemsPerPage = val; currentPage = 0; }"
    @update:page="val => { currentPage = val; }"
  />
</template>

<style scoped>
.text-wrap {
  width: auto;
  white-space: normal;
  word-wrap: break-word;
}
</style>
