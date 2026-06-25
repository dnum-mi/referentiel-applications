<script setup lang="ts">
import { onMounted, ref, computed, watch } from "vue";
import { useRoute } from "vue-router";
const route = useRoute();
import { useMetadataStore } from "@/stores/metadataStore";
import { formatDate } from "@/composables/use-date";
import { metadataActionLabels } from "@/constants/dictionary";
import PaginationFooter from "@/components/PaginationFooter.vue";
import RefAppTable from "@/components/RefAppTable.vue";
import type { TableColumn, TableSortEvent } from "@/types/table";
import type { PaginatedMetadataDto } from "@/client/types.gen";

const columns: TableColumn[] = [
  { field: "Application", header: "Application", sortable: true },
  { field: "Auteur", header: "Auteur", sortable: true },
  { field: "Organisation", header: "Organisation", sortable: true },
  { field: "Type", header: "Type", sortable: true },
  { field: "Date", header: "Date", sortable: true },
  { field: "Titre", header: "Titre", sortable: false },
  { field: "Actions", header: "Actions", sortable: false },
];

const currentPage = ref(0);
const pageSize = ref(15);
const sortField = ref("Date");
const sortOrder = ref(-1);
const createdAtGte = ref<string>("");
const createdAtLte = ref<string>("");

const metadataStore = useMetadataStore();

const data = ref<PaginatedMetadataDto>({ results: [], total: 0 });
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

function convertLocalToUTC(localDateTimeString: string): string {
  if (!localDateTimeString) return "";
  const localDate = new Date(localDateTimeString);
  return localDate.toISOString();
}

function fetchData() {
  const filters: any = {
    page: currentPage.value,
    pageSize: pageSize.value,
    sortBy: columnToFieldKeyMap[sortField.value],
    order: sortOrder.value === -1 ? "desc" : "asc",
    createdAtGte: createdAtGte.value ? convertLocalToUTC(createdAtGte.value) : undefined,
    createdAtLte: createdAtLte.value ? convertLocalToUTC(createdAtLte.value) : undefined,
  };

  isLoading.value = true;
  return metadataStore
    .fetchMetadatasGlobal(filters)
    .then(() => {
      data.value = {
        results: metadataStore.metadatas,
        total: metadataStore.total,
      } as PaginatedMetadataDto;
    })
    .finally(() => {
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
  sortField.value = "Date";
  sortOrder.value = -1;
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

function onSort(event: TableSortEvent) {
  sortField.value = event.sortField || "Date";
  sortOrder.value = event.sortOrder;
  currentPage.value = 0;
  fetchData();
}

onMounted(async () => {
  await fetchData();
});

function getDescriptionSummary(meta: any): string {
  return (meta.description || "").split("\n")[0];
}

const metadataTableRows = computed(() =>
  data.value.results.map((meta) => {
    return {
      id: meta.id,
      Application: {
        id: meta.id,
        label: meta.applicationId ? (meta.application?.label ?? "Application inconnue") : "-",
        to: meta.applicationId ? { name: "application", params: { id: meta.applicationId } } : undefined,
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
          <DsfrInput v-model="createdAtLte" label="Date de fin" label-visible type="datetime-local" data-testid="history-filter-date-to" />
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

    <div v-if="metadataTableRows.length === 0" class="text-center fr-mb-3w" data-testid="history-empty">
      <p>Aucune donnée recensée.</p>
    </div>

    <div v-else>
      <RefAppTable
        :items="metadataTableRows"
        :columns="columns"
        :loading="isLoading"
        :lazy="true"
        :total-records="data.total"
        :sort-field="sortField"
        :sort-order="sortOrder"
        data-testid="history-table"
        empty-message="Aucune donnée recensée."
        @sort="onSort"
      >
        <template #body-Actions="{ data }">
          <router-link
            :to="{ name: 'metadata-detail', params: { id: data.Actions.id }, query: { from: route.fullPath } }"
            class="fr-btn fr-btn--secondary fr-btn--sm"
            data-testid="history-see-more-button"
          >
            Voir plus
          </router-link>
        </template>

        <template #body-Application="{ data }">
          <template v-if="data.Application && data.Application.to">
            <router-link :to="data.Application.to" :data-testid="`history-row-${data.Application.id}-application`">
              {{ data.Application.label }}
            </router-link>
          </template>
          <template v-else>
            <span :data-testid="`history-row-${data.Application.id}-application`">{{ data.Application.label }}</span>
          </template>
        </template>

        <template #body-Type="{ data }">
          <DsfrTag :class="data.Type.class" :label="data.Type.label" :data-testid="`history-row-${data.Type.id}-type`" />
        </template>
      </RefAppTable>

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
.add {
  background-color: #e6f8ea;
  color: #1aa779;
}
.update {
  background-color: #f8f3e6;
  color: #a7791a;
}
.delete {
  background-color: #f8e6e6;
  color: #a71a1a;
}
</style>
