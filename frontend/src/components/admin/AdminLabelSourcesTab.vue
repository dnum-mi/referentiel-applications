<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { watchDebounced } from "@vueuse/core";
import type { LabelSourceControllerFindAllData, LabelSourceDto } from "@/client/types.gen";
import type { DsfrDataTableHeaderCellObject } from "@gouvminint/vue-dsfr";
import type { DataTablePageEvent } from "primevue/datatable";
import LabelSourceActions from "./LabelSourceActions.vue";
import api from "@/api";
import RefAppTable from "@/components/RefAppTable.vue";
import type { TableColumn, TableSortEvent } from "@/types/table";

// L'API renvoie le décompte des labels liés, non déclaré dans LabelSourceDto.
type LabelSourceRow = LabelSourceDto & { _count?: { Label: number } };
const data = ref<{ results: LabelSourceRow[]; total: number }>({ results: [], total: 0 });

const headers: (DsfrDataTableHeaderCellObject & { isSortable?: boolean })[] = [
  {
    key: "source",
    label: "Valeur",
    isSortable: true,
  },
  {
    key: "count",
    label: "Noms alternatifs liés",
  },
  {
    key: "actions",
    label: "Actions",
  },
] as const;

const tableColumns: TableColumn[] = headers.map((h) => ({
  field: h.key,
  header: h.label,
  sortable: h.isSortable || false,
}));

const isLoading = ref(false);
const searchQuery = ref("");

const sortColumn = ref<(typeof headers)[number]["key"]>();
const isSortDescending = ref(false);

const itemsPerPage = ref(15);
const currentPage = ref(0);
const firstIndex = computed(() => currentPage.value * itemsPerPage.value);

// RGAA-084 (7.5) : message de statut sur le nombre de résultats, restitué aux TA.
const statusMessage = computed(() => {
  if (isLoading.value) return "Chargement des sources de noms alternatifs…";
  const total = data.value.total;
  if (total === 0) return "Aucune donnée ne correspond à votre recherche : Résultat 0 à 0";
  const from = firstIndex.value + 1;
  const to = Math.min(firstIndex.value + data.value.results.length, total);
  return `Résultat ${from} à ${to} sur ${total}`;
});

async function fetchLabelSources() {
  isLoading.value = true;

  const query: NonNullable<LabelSourceControllerFindAllData["query"]> = {
    source: searchQuery.value || undefined,
    page: currentPage.value,
    pageSize: itemsPerPage.value,
    sortBy: sortColumn.value,
    order: isSortDescending.value ? "desc" : "asc",
  };

  const response = await api.labelSourceControllerFindAll({ query });
  if (!response.data?.results) {
    isLoading.value = false;
    return;
  }
  data.value = response.data;
  isLoading.value = false;
}

watchDebounced(
  searchQuery,
  async () => {
    currentPage.value = 0;
    await fetchLabelSources();
  },
  { debounce: 300 },
);

watch([sortColumn, isSortDescending], () => {
  currentPage.value = 0;
  fetchLabelSources();
});

const tableRows = computed(() =>
  data.value.results.map((labelSource) => ({
    source: labelSource.source,
    count: labelSource._count?.Label ?? 0,
    actions: labelSource,
  })),
);

function onSort(event: TableSortEvent) {
  sortColumn.value = event.sortField as (typeof headers)[number]["key"];
  isSortDescending.value = event.sortOrder === -1;
}

function onPage(event: DataTablePageEvent) {
  currentPage.value = event.page;
  itemsPerPage.value = event.rows;
  fetchLabelSources();
}

onMounted(fetchLabelSources);
</script>

<template>
  <div class="header-row">
    <h1 class="fr-h1" data-testid="admin-label-sources-title">Gestion des sources de noms alternatifs</h1>

    <LabelSourceActions @fetch-tags="fetchLabelSources" :is-creating="true" />
  </div>

  <div class="fr-mb-4w">
    <DsfrSearchBar
      v-model.trim="searchQuery"
      label="Rechercher une source de noms alternatifs"
      placeholder="Rechercher par valeur..."
      button-text="Rechercher"
      class="fr-col-12"
      data-testid="admin-label-source-search"
    />
  </div>

  <div aria-live="polite" aria-atomic="true" class="fr-sr-only" data-testid="admin-label-sources-status">
    <p>{{ statusMessage }}</p>
  </div>

  <div v-if="isLoading" class="fr-alert fr-alert--info" data-testid="admin-label-sources-loading">
    <p>Chargement des sources de noms alternatifs...</p>
  </div>

  <div v-else>
    <RefAppTable
      :items="tableRows"
      :columns="tableColumns"
      :paginator="true"
      :lazy="true"
      :rows="itemsPerPage"
      :first="firstIndex"
      :total-records="data.total"
      :sort-field="sortColumn"
      :sort-order="isSortDescending ? -1 : 1"
      data-testid="admin-label-sources-table"
      @sort="onSort"
      @page="onPage"
    >
      <template #body-actions="{ data: row }">
        <LabelSourceActions :label-source="row.actions" @fetch-label-sources="fetchLabelSources" />
      </template>
    </RefAppTable>
  </div>
</template>

<style scoped>
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
