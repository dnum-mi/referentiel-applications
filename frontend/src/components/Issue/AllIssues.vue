<script setup lang="ts">
import { onMounted, computed, ref, watch } from "vue";
import { routeNames } from "@/router/route-names";
import { useUserStore } from "@/stores/userStore";
import { formatDate } from "@/composables/use-date";
import { useReportIssueStore } from "@/stores/reportIssueStore";
import { useDebouncedFn } from "@/composables/use-debouncefn";
import type { DsfrDataTableHeaderCell, DsfrDataTableRow } from "@gouvminint/vue-dsfr";
import type { GenericRow } from "@/utils/types";

const title = "Liste de toutes les corrections d'applications";
const headers = [
  { key: "application", label: "Application" },
  { key: "notifier", label: "Signalant" },
  { key: "description", label: "Description" },
  { key: "date", label: "Date" },
  { key: "status", label: "Statut" },
] as const satisfies DsfrDataTableHeaderCell[];

const userStore = useUserStore();
const reportStore = useReportIssueStore();

const isEditing = ref<boolean>(false);

const selection = ref<string[]>([]);
const currentPage = ref(0);
const searchReport = ref(reportStore.filters.searchReport);

const sortBy = ref<string>("date");
const sortedDesc = ref<boolean>(reportStore.filters.order === "desc");

const isLoading = computed(() => reportStore.isLoading);

const rows = computed<DsfrDataTableRow[]>(() =>
  (reportStore.allReports || []).map((report): GenericRow<typeof headers> => ({
    id: report.id,
    application: {
      label: report.application?.label,
      to: report.application?.id
        ? { name: routeNames.PROFILEAPP, params: { id: report.application.id } }
        : undefined,
    },
    notifier: report.notifier?.email || "Inconnu",
    description: report.description,
    date: formatDate(report.createdAt),
    status: {
      report,
      isEditing: isEditing.value,
    },
  })),
);

const { run: debouncedSearch } = useDebouncedFn(() => {
  reportStore.fetchAllReports();
}, 300);

watch(searchReport, (val) => {
  reportStore.setFilter("searchReport", val);
  reportStore.setFilter("page", 0);
  debouncedSearch();
});

watch(reportStore.filters, () => {
  searchReport.value = reportStore.filters.searchReport;
}, { deep: true });

onMounted(async () => {
  debouncedSearch();
});
</script>

<template>
  <div class="fr-my-2v w-[800px]">
    <AppLoader v-if="isLoading" />
    <div v-else>
      <div v-if="userStore.adminLevel >= 30">
        <div v-if="!isEditing && rows.length" class="toRight">
          <DsfrButton label="Modifier" class="fr-mr-1w" :onclick="() => { isEditing = true }" />
        </div>
        <div v-else-if="rows.length" class="toRight">
          <DsfrButton
            label="Arreter de  modifier" :onclick="() => { isEditing = false }"
          />
        </div>

        <div class="searchBar">
          <span class="fr-text--lg fr-text--bold">Rechercher un Report</span>
          <DsfrInput
            v-model="searchReport"
            class="fr-mt-3w"
          />
        </div>
      </div>
      <div v-if="!rows.length" class="text-center">
        <p>Aucune correction recensée.</p>
      </div>
      <DsfrDataTable
        v-else
        v-model:selection="selection"
        v-model:current-page="currentPage"
        v-model:sorted-by="sortBy"
        v-model:sorted-desc="sortedDesc"
        data-testid="issues-table"
        :headers-row="headers"
        :rows="rows"
        row-key="id"
        :title="title"
        pagination
        :rows-per-page="10"
        :pagination-options="[10, 20, 30, 50]"
        bottom-action-bar-class="bottom-action-bar-class"
        pagination-wrapper-class="pagination-wrapper-class"
        sortable-rows
      >
        <template #header="{ key, label }">
          <div :class="{ 'select-status': key === 'status' }">
            <em>{{ label }}</em>
          </div>
        </template>
        <template #cell="{ colKey, cell }">
          <template v-if="colKey === 'application'">
            <template v-if="cell && cell.to && cell.to.params && cell.to.params.id">
              <router-link :to="cell.to" :data-testid="`issues-row-${cell.id}-application`">
                {{ cell.label || 'Voir l’application' }}
              </router-link>
            </template>
            <template v-else>
              <span :data-testid="`issues-row-${cell.id}-application`">{{ cell.label || 'Signalement global' }}</span>
            </template>
          </template>
          <template v-else-if="colKey === 'description'">
            <p class="text-wrap">
              {{ cell }}
            </p>
          </template>
          <template v-else-if="colKey === 'status'">
            <ReportStatusTag :report="cell.report" :is-editing="cell.isEditing" class="select-status" @refresh="reportStore.fetchAllReports()" />
          </template>
          <template v-else>
            {{ cell }}
          </template>
        </template>
      </DsfrDataTable>
    </div>
  </div>
</template>

<style scoped>
.toRight {
  justify-self: end;
}

.toRight button {
  margin-right: 1vw;
}

.text-wrap {
  width: auto;
  white-space: normal;
  word-wrap: break-word;
}

.searchBar {
  justify-self: baseline;
  width: 15vw;
}

.select-status {
  width: 8rem;
}
</style>
