<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { watchDebounced } from "@vueuse/core";
import type { LabelSourceDto } from "@/client/types.gen";
import type { DsfrDataTableHeaderCellObject } from "@gouvminint/vue-dsfr";
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

async function fetchLabelSources() {
  isLoading.value = true;

  const query: Record<string, any> = {
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

function onPage(event: any) {
  currentPage.value = event.page;
  itemsPerPage.value = event.rows;
  fetchLabelSources();
}

onMounted(fetchLabelSources);
</script>

<template>
  <div class="header-row">
    <h1 class="fr-h1" data-testid="admin-label-sources-title">Gestion des sources de noms alternatifs</h1>

    <LabelSourceActions @fetch-tags="fetchLabelSources" :isCreating="true" />
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
      <template #body-actions="{ data }">
        <LabelSourceActions :label-source="data.actions" @fetch-label-sources="fetchLabelSources" />
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
