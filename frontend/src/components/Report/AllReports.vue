<script setup lang="ts">
import api from "@/api";
import type { ReportPaginatedResponseDto } from "@/client/types.gen";
import RefAppTable from "@/components/RefAppTable.vue";
import { formatDate } from "@/composables/use-date";
import { useDebouncedFn } from "@/composables/use-debouncefn";
import { routeNames } from "@/router/route-names";
import { useUserStore } from "@/stores/userStore";
import type { TableColumn, TableSortEvent } from "@/types/table";
import type { GenericRow } from "@/utils/types";
import type { DsfrDataTableHeaderCell } from "@gouvminint/vue-dsfr";
import { DsfrSearchBar } from "@gouvminint/vue-dsfr";
import { computed, ref, watch } from "vue";

const props = defineProps<{
  isActive: boolean;
}>();

const title = "Liste de tous les signalements d'applications";
const headers = [
  { key: "application", label: "Application" },
  { key: "notifier", label: "Signalant" },
  { key: "description", label: "Description" },
  { key: "notes", label: "Notes" },
  { key: "date", label: "Date" },
  { key: "status", label: "Statut" },
] as const satisfies DsfrDataTableHeaderCell[];

const tableColumns: TableColumn[] = headers.map((h) => ({
  field: h.key,
  header: h.label,
  sortable: true,
}));

const userStore = useUserStore();

const data = ref<ReportPaginatedResponseDto>({ results: [], total: 0 });
const isLoading = ref(false);
const isEditing = ref<boolean>(false);
const selection = ref<string[]>([]);
const currentPage = ref(0);
const itemsPerPage = ref(15);
const firstIndex = computed(() => currentPage.value * itemsPerPage.value);
const searchReport = ref("");
const sortBy = ref<"application" | "description" | "date" | "status" | "signalant" | "notes">("date");
const sortedDesc = ref<boolean>(true);

const rows = computed(() =>
  (data.value.results || []).map(
    (report: any): GenericRow<typeof headers> => ({
      id: report.id,
      application: {
        label: report.application?.label,
        to: report.application?.id ? { name: routeNames.PROFILEAPP, params: { id: report.application.id } } : undefined,
      },
      notifier: report.notifier?.email || "Inconnu",
      description: report.description,
      notes: report.notes,
      date: formatDate(report.updatedAt),
      status: {
        report,
        isEditing: isEditing.value,
      },
    }),
  ),
);

const { run: debouncedSearch } = useDebouncedFn(async () => {
  await fetchAllReportsDirect();
}, 300);

async function fetchAllReportsDirect() {
  isLoading.value = true;
  try {
    const query = {
      all: true,
      searchReport: searchReport.value,
      page: currentPage.value,
      limit: itemsPerPage.value,
      sortBy: sortBy.value,
      order: (sortedDesc.value ? "desc" : "asc") as "desc" | "asc",
    };
    const response = await api.reportsControllerFindAll({ query });
    data.value = response.data as ReportPaginatedResponseDto;
  } finally {
    isLoading.value = false;
  }
}

watch(searchReport, () => {
  currentPage.value = 0;
  debouncedSearch();
});

watch([currentPage, itemsPerPage, sortBy, sortedDesc], fetchAllReportsDirect);

function onSort(event: TableSortEvent) {
  sortBy.value = event.sortField as typeof sortBy.value;
  sortedDesc.value = event.sortOrder === -1;
}

function onPage(event: any) {
  currentPage.value = event.page;
  itemsPerPage.value = event.rows;
}

watch(
  () => props.isActive,
  async (isActive) => {
    if (isActive) {
      await fetchAllReportsDirect();
    }
  },
  { immediate: true },
);
</script>

<template>
  <AppLoader v-if="isLoading" />
  <div v-else>
    <div v-if="userStore.adminLevel >= 30">
      <div v-if="!isEditing && rows.length" class="toRight">
        <DsfrButton
          label="Modifier"
          class="fr-mb-1w"
          :onclick="
            () => {
              isEditing = true;
            }
          "
        />
      </div>
      <div v-else-if="rows.length" class="toRight">
        <DsfrButton
          label="Arreter de  modifier"
          :onclick="
            () => {
              isEditing = false;
            }
          "
        />
      </div>
    </div>
    <div class="fr-mb-4w">
      <DsfrSearchBar
        v-model.trim="searchReport"
        label="Rechercher un signalement"
        placeholder="Recherche par description ou par email du signalant"
        button-text="Rechercher"
        class="fr-col-12"
        data-testid="issues-search-bar"
      />
    </div>
    <div v-if="!rows.length" class="text-center">
      <p>Aucun signalement recensé.</p>
    </div>
    <RefAppTable
      v-else
      :items="rows"
      :columns="tableColumns"
      :paginator="true"
      :lazy="true"
      :rows="itemsPerPage"
      :first="firstIndex"
      :total-records="data.total"
      :sort-field="sortBy"
      :sort-order="sortedDesc ? -1 : 1"
      data-testid="issues-table"
      @sort="onSort"
      @page="onPage"
    >
      <template #body-application="{ data }">
        <router-link v-if="data.application.to" :to="data.application.to" :data-testid="`issues-row-${data.id}-application`">
          {{ data.application.label || "Voir l'application" }}
        </router-link>
        <span v-else :data-testid="`issues-row-${data.id}-application`">{{ data.application.label || "Signalement global" }}</span>
      </template>

      <template #body-description="{ data }">
        <p class="text-wrap">
          {{ data.description }}
        </p>
      </template>

      <template #body-notes="{ data }">
        <p class="text-wrap">
          <Notes
            :notes="data.notes"
            :report-id="data.status.report.id"
            :is-editing="data.status.isEditing"
            @refresh="fetchAllReportsDirect()"
          />
        </p>
      </template>

      <template #body-status="{ data }">
        <ReportStatusTag
          :report="data.status.report"
          :is-editing="data.status.isEditing"
          class="select-status"
          @refresh="fetchAllReportsDirect()"
        />
      </template>
    </RefAppTable>
  </div>
</template>

<style scoped>
.text-wrap {
  width: auto;
  white-space: normal;
  word-wrap: break-word;
}
</style>
