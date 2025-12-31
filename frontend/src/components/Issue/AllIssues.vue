<script setup lang="ts">
import { onMounted, computed, ref, watch } from "vue";
import { routeNames } from "@/router/route-names";
import { useUserStore } from "@/stores/userStore";
import { formatDate } from "@/composables/use-date";
import api from "@/api";
import PaginationFooter from "../PaginationFooter.vue";
import { useDebouncedFn } from "@/composables/use-debouncefn";
import { DsfrSearchBar } from "@gouvminint/vue-dsfr";
import type { DsfrDataTableHeaderCell } from "@gouvminint/vue-dsfr";
import type { GenericRow } from "@/utils/types";
import type { AnomalyNotificationPaginatedResponseDto } from "@/client/types.gen";

const title = "Liste de tous les signalements d'applications";
const headers = [
  { key: "application", label: "Application" },
  { key: "notifier", label: "Signalant" },
  { key: "description", label: "Description" },
  { key: "date", label: "Date" },
  { key: "status", label: "Statut" },
] as const satisfies DsfrDataTableHeaderCell[];

const userStore = useUserStore();

const data = ref<AnomalyNotificationPaginatedResponseDto>({ results: [], total: 0 });
const isLoading = ref(false);
const isEditing = ref<boolean>(false);
const selection = ref<string[]>([]);
const currentPage = ref(0);
const itemsPerPage = ref(15);
const searchReport = ref("");
const sortBy = ref<"application" | "description" | "date" | "status" | "signalant">("date");
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
      date: formatDate(report.createdAt),
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
    const response = await api.anomalyNotificationsControllerFindAll({ query });
    data.value = response.data as AnomalyNotificationPaginatedResponseDto;
  } finally {
    isLoading.value = false;
  }
}

watch(searchReport, () => {
  currentPage.value = 0;
  debouncedSearch();
});

watch([currentPage, itemsPerPage, sortBy, sortedDesc], fetchAllReportsDirect);

onMounted(async () => {
  await fetchAllReportsDirect();
});
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
        label="Rechercher un report"
        placeholder="Recherche par description ou par email du signalant"
        button-text="Rechercher"
        class="fr-col-12"
        data-testid="issues-search-bar"
      />
    </div>
    <div v-if="!rows.length" class="text-center">
      <p>Aucune correction recensée.</p>
    </div>
    <DsfrDataTable
      v-else
      v-model:selection="selection"
      v-model:sorted-by="sortBy"
      v-model:sorted-desc="sortedDesc"
      data-testid="issues-table"
      :headers-row="headers"
      :rows="rows"
      row-key="id"
      :title="title"
      :sortable-rows="true"
    >
      <template #header="{ key, label }">
        <div :class="{ 'select-status': key === 'status' }">
          <em>{{ label }}</em>
        </div>
      </template>
      <template #cell="{ colKey, cell }">
        <template v-if="colKey === 'application'">
          <template v-if="cell && (cell as any).to && (cell as any).to.params && (cell as any).to.params.id">
            <router-link :to="(cell as any).to" :data-testid="`issues-row-${(cell as any).id}-application`">
              {{ (cell as any).label || "Voir l’application" }}
            </router-link>
          </template>
          <template v-else>
            <span :data-testid="`issues-row-${(cell as any).id}-application`">{{ (cell as any).label || "Signalement global" }}</span>
          </template>
        </template>
        <template v-else-if="colKey === 'description'">
          <p class="text-wrap">
            {{ cell }}
          </p>
        </template>
        <template v-else-if="colKey === 'status'">
          <ReportStatusTag
            :report="(cell as any).report"
            :is-editing="(cell as any).isEditing"
            class="select-status"
            @refresh="fetchAllReportsDirect()"
          />
        </template>
        <template v-else>
          {{ cell }}
        </template>
      </template>
    </DsfrDataTable>
    <PaginationFooter
      :total-filtered="data.total"
      :limit="itemsPerPage"
      :page="currentPage"
      @update:limit="
        (val) => {
          itemsPerPage = val;
          currentPage = 0;
          fetchAllReportsDirect();
        }
      "
      @update:page="
        (val) => {
          currentPage = val;
          fetchAllReportsDirect();
        }
      "
    />
  </div>
</template>

<style scoped>
.text-wrap {
  width: auto;
  white-space: normal;
  word-wrap: break-word;
}
</style>
