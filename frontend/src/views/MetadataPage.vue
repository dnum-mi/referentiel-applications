<script setup lang="ts">
import { onMounted, ref, computed, watch } from "vue";
import { useRoute } from 'vue-router';
const route = useRoute();
import { useMetadataStore } from "@/stores/metadataStore";
import { formatDate } from "@/composables/use-date";
import { metadataActionLabels } from "@/composables/use-dictionary";
import PaginationFooter from "@/components/PaginationFooter.vue";
import type { MetadataPaginatedResponseDto } from "@/client/types.gen";

const headers = [
  "Application",
  "Auteur",
  "Organisation",
  "Type",
  "Date",
  "Titre",
  "Actions",
];

const currentPage = ref(0);
const pageSize = ref(15);
const sortBy = ref("Date");
const isSortDescending = ref(true);
const createdAtGte = ref<string>("");
const createdAtLte = ref<string>("");

const metadataStore = useMetadataStore();

const data = ref<MetadataPaginatedResponseDto>({ results: [], total: 0 });
const isLoading = ref(false);

const columnToFieldKeyMap: Record<string, string> = {
  Application: "application.label",
  Auteur: "createdBy.email",
  Organisation: "createdBy.organization.path",
  Type: "action",
  Date: "createdAt",
  Description: "description",
};

watch([currentPage, pageSize], () => {
  fetchData();
});

watch([sortBy, isSortDescending], () => {
  currentPage.value = 0;
  fetchData();
});

function convertLocalToUTC(localDateTimeString: string): string {
  if (!localDateTimeString) return "";
  const localDate = new Date(localDateTimeString);
  return localDate.toISOString();
}

function fetchData() {
  const filters: any = {
    page: currentPage.value,
    pageSize: pageSize.value,
    sortBy: columnToFieldKeyMap[sortBy.value],
    order: isSortDescending.value ? "desc" : "asc",
    createdAtGte: createdAtGte.value ? convertLocalToUTC(createdAtGte.value) : undefined,
    createdAtLte: createdAtLte.value ? convertLocalToUTC(createdAtLte.value) : undefined,
  };

  isLoading.value = true;
  return metadataStore.fetchMetadatasGlobal(filters).then(() => {
    data.value = {
      results: metadataStore.metadatas,
      total: metadataStore.total,
    } as MetadataPaginatedResponseDto;
  }).finally(() => {
    isLoading.value = false;
  });
}

async function applyFilters() {
  currentPage.value = 0;
  await fetchData();
}

function clearFilters() {
  createdAtGte.value = "";
  createdAtLte.value = "";
  sortBy.value = "Date";
  isSortDescending.value = true;
  applyFilters();
}

// Pagination handlers
function handlePageChange(newPage: number) {
  currentPage.value = newPage;
}

function handlePageSizeChange(newPageSize: number) {
  pageSize.value = newPageSize;
  currentPage.value = 0;
}

function onUpdateSortColumn(columnName: string | undefined) {
  sortBy.value = columnName || "Date";
}

onMounted(async () => {
  await fetchData();
});

function getDescriptionSummary(meta: any): string {
  return (meta.description || '').split('\n')[0];
}

const metadataTableRows = computed(() =>
  data.value.results.map((meta) => {
    return {
      id: meta.id,
      Application: {
        id: meta.id,
        label: meta.application?.label ?? "Application inconnue",
        to: meta.applicationId
          ? { name: "application", params: { id: meta.applicationId } }
          : undefined,
      },
      Auteur: meta.createdBy?.email ?? "Inconnu",
      Organisation: (meta.createdBy as any)?.organization?.path ?? "-",
      Type: {
        id: meta.id,
        component: "DsfrTag",
        label: metadataActionLabels[meta.action],
        class: meta.action,
      },
  Date: formatDate(meta.createdAt),
  Titre: getDescriptionSummary(meta),
  Actions: {
    id: meta.id,
  },
    };
  }),
);
</script>

<template>
  <div class="fr-container--fluid fr-px-2w">
    <h1>Modifications</h1>

    <!-- Filters and Sorting form -->
    <form class="fr-mb-4w" @submit.prevent="applyFilters">
      <h3>Filtres</h3>

      <!-- Date filters -->
      <div class="fr-grid-row fr-grid-row--gutters fr-mb-1w">
        <div class="fr-col-12 fr-col-md-4">
          <DsfrInput
            v-model="createdAtGte"
            label="Date de début"
            label-visible
            type="datetime-local"
            data-testid="history-filter-date-from"
          />
        </div>
        <div class="fr-col-12 fr-col-md-4">
          <DsfrInput
            v-model="createdAtLte"
            label="Date de fin"
            label-visible
            type="datetime-local"
            data-testid="history-filter-date-to"
          />
        </div>
      </div>

      <!-- Action buttons -->
      <div class="fr-btns-group fr-btns-group--inline">
        <DsfrButton
          type="submit"
          label="Appliquer"
          :disabled="isLoading"
          title="Appliquer les filtres"
          aria-label="Appliquer les filtres"
          data-testid="history-apply-filters"
        />
        <DsfrButton
          type="button"
          secondary
          label="Effacer"
          :disabled="isLoading"
          data-testid="history-clear-filters"
          title="Effacer les filtres"
          aria-label="Effacer les filtres"
          @click="clearFilters"
        />
      </div>
    </form>

    <div v-if="isLoading" class="fr-mb-3w">
      <AppLoader data-testid="history-loader" />
    </div>

    <div v-else-if="metadataTableRows.length === 0" class="text-center fr-mb-3w" data-testid="history-empty">
      <p>Aucune donnée recensée.</p>
    </div>

    <div v-else>
      <DsfrDataTable
        :key="`${currentPage}-${pageSize}-${sortBy}-${isSortDescending}`"
        v-model:sorted-by="sortBy"
        v-model:sorted-desc="isSortDescending"
        :sort-fn="(a, b) => (isSortDescending ? -1 : 1)"
        :headers-row="headers"
        :rows="metadataTableRows"
        :sortable-rows="['Application', 'Auteur', 'Organisation', 'Type', 'Date']"
        row-key="id"
        :pagination="false"
        title="Données"
        data-testid="history-table"
        @update:sorted-by="onUpdateSortColumn"
      >
        <template #cell="{ colKey, cell }">
          <template v-if="colKey === 'Actions'">
            <router-link
              :to="{ name: 'metadata-detail', params: { id: (cell as any).id }, query: { from: route.fullPath } }"
              class="fr-btn fr-btn--secondary fr-btn--sm"
              data-testid="history-see-more-button"
            >
              Voir plus
            </router-link>
          </template>
          <template v-else-if="colKey === 'Application'">
            <template v-if="cell && (cell as any).to">
              <router-link :to="(cell as any).to" :data-testid="`history-row-${(cell as any).id}-application`">
                {{ (cell as any).label }}
              </router-link>
            </template>
            <template v-else>
              <span :data-testid="`history-row-${(cell as any).id}-application`">{{ (cell as any).label }}</span>
            </template>
          </template>
          <template v-else-if="colKey === 'Type'">
            <DsfrTag :class="(cell as any).class" :label="(cell as any).label" :data-testid="`history-row-${(cell as any).id}-type`" />
          </template>
          <template v-else>
            {{ cell }}
          </template>
        </template>
      </DsfrDataTable>

      <!-- Pagination -->
      <PaginationFooter
        :total-filtered="data.total"
        :limit="pageSize"
        :page="currentPage"
        data-testid="history-pagination-footer"
        @update:limit="handlePageSizeChange"
        @update:page="handlePageChange"
      />
    </div>
  </div>
</template>

<style scoped>
.add { background-color: #e6f8ea; color: #1aa779; }
.update { background-color: #f8f3e6; color: #a7791a; }
.delete { background-color: #f8e6e6; color: #a71a1a; }
</style>
