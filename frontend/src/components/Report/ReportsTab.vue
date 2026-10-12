<script setup lang="ts">
import api from "@/api";
import { isApiSuccess } from "@/api/api-result";
import { Permission, type PaginatedReportDto, type ReportDto } from "@/client/types.gen";
import RefAppTable from "@/components/RefAppTable.vue";
import { formatDate } from "@/composables/use-date";
import { watchDebounced } from "@vueuse/core";
import { routeNames } from "@/router/route-names";
import { useUserStore } from "@/stores/userStore";
import type { TableColumn, TableSortEvent } from "@/types/table";
import type { GenericRow } from "@/utils/types";
import type { DsfrDataTableHeaderCell } from "@gouvminint/vue-dsfr";
import { DsfrSearchBar } from "@gouvminint/vue-dsfr";
import type { DataTablePageEvent } from "primevue/datatable";
import { computed, ref, watch } from "vue";

const props = defineProps<{
  isActive: boolean;
  allReport: boolean;
}>();

const isAllReport = computed(() => props.allReport);

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

const data = ref<PaginatedReportDto>({ results: [], total: 0 });
const isLoading = ref(false);
const isEditing = ref<boolean>(false);
const currentPage = ref(0);
const itemsPerPage = ref(15);
const firstIndex = computed(() => currentPage.value * itemsPerPage.value);
const searchReport = ref("");
const errorMessage = ref("");
let latestRequest = 0;
const sortBy = ref<"application" | "description" | "date" | "status" | "notifier" | "notes">("date");
const sortedDesc = ref<boolean>(true);

const rows = computed(() =>
  (data.value.results || []).map(
    (report: ReportDto): GenericRow<typeof headers> => ({
      id: report.id,
      application: {
        label: report.application?.label,
        to: report.application?.id ? { name: routeNames.PROFILEAPP, params: { id: report.application.id } } : undefined,
      },
      // Signalement créé sous impersonation : afficher aussi l'admin réel (#2061).
      notifier: report.impersonator?.email
        ? `${report.notifier?.email || "Inconnu"} (via ${report.impersonator.email})`
        : report.notifier?.email || "Inconnu",
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

async function fetchAllReportsDirect() {
  const request = ++latestRequest;
  isLoading.value = true;
  errorMessage.value = "";
  try {
    const query = {
      all: isAllReport.value,
      searchReport: searchReport.value,
      page: currentPage.value,
      limit: itemsPerPage.value,
      sortBy: sortBy.value,
      order: (sortedDesc.value ? "desc" : "asc") as "desc" | "asc",
    };
    const response = await api.reportsControllerFindAll({ query });
    if (request !== latestRequest) return;
    if (!isApiSuccess(response) || !response.data) {
      throw new Error("Les signalements n’ont pas pu être chargés.");
    }
    data.value = response.data;
  } catch {
    if (request === latestRequest) errorMessage.value = "Les signalements n’ont pas pu être chargés. Réessayez.";
  } finally {
    if (request === latestRequest) isLoading.value = false;
  }
}

watchDebounced(
  searchReport,
  async () => {
    currentPage.value = 0;
    await fetchAllReportsDirect();
  },
  { debounce: 300 },
);

watch([currentPage, itemsPerPage, sortBy, sortedDesc], fetchAllReportsDirect);

function onSort(event: TableSortEvent) {
  sortBy.value = event.sortField as typeof sortBy.value;
  sortedDesc.value = event.sortOrder === -1;
}

function onPage(event: DataTablePageEvent) {
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
  <div>
    <div v-if="userStore.hasPermissions([Permission.ADMIN_PANEL_MANAGE])">
      <div v-if="!isEditing && rows.length" class="toRight">
        <DsfrButton label="Modifier" class="fr-mb-1w" @click="isEditing = true" />
      </div>
      <div v-else-if="rows.length" class="toRight">
        <DsfrButton label="Arrêter de modifier" @click="isEditing = false" />
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
    <output class="fr-sr-only" aria-live="polite" aria-atomic="true">
      {{
        isLoading
          ? "Chargement des signalements…"
          : `${data.total} signalement${data.total > 1 ? "s" : ""} trouvé${data.total > 1 ? "s" : ""}.`
      }}
    </output>
    <div v-if="errorMessage" role="alert" class="fr-error-text">
      <p>{{ errorMessage }}</p>
      <button class="fr-btn fr-btn--secondary" type="button" @click="fetchAllReportsDirect">Réessayer</button>
    </div>
    <div v-else-if="!rows.length && !isLoading" class="text-center">
      <p>Aucun signalement recensé.</p>
    </div>
    <RefAppTable
      v-if="rows.length"
      :items="rows"
      data-key="id"
      :loading="isLoading"
      caption="Liste des signalements"
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
      <template #body-application="{ data: row }">
        <router-link v-if="row.application.to" :to="row.application.to" :data-testid="`issues-row-${row.id}-application`">
          {{ row.application.label || "Voir l'application" }}
        </router-link>
        <span v-else :data-testid="`issues-row-${row.id}-application`">{{ row.application.label || "Signalement global" }}</span>
      </template>

      <template #body-description="{ data: row }">
        <p class="text-wrap">
          {{ row.description }}
        </p>
      </template>

      <template #body-notes="{ data: row }">
        <div class="text-wrap">
          <Notes
            :notes="row.notes"
            :report-description="row.description"
            :report-id="row.status.report.id"
            :is-editing="row.status.isEditing"
            @refresh="fetchAllReportsDirect()"
          />
        </div>
      </template>

      <template #body-status="{ data: row }">
        <ReportStatusTag
          :report="row.status.report"
          :is-editing="row.status.isEditing"
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
