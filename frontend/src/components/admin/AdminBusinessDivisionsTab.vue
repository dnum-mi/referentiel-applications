<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { watchDebounced } from "@vueuse/core";
import type { BusinessDivisionDto } from "@/client/types.gen";
import type { DsfrDataTableHeaderCellObject } from "@gouvminint/vue-dsfr";
import BusinessDivisionActions from "./BusinessDivisionActions.vue";
import api from "@/api";
import RefAppTable from "@/components/RefAppTable.vue";
import type { TableColumn, TableSortEvent } from "@/types/table";

// L'API renvoie le décompte des liaisons, non déclaré dans BusinessDivisionDto.
type BusinessDivisionRow = BusinessDivisionDto & { _count?: { organizations: number; applications: number } };
const data = ref<{ results: BusinessDivisionRow[]; total: number }>({ results: [], total: 0 });

const headers: (DsfrDataTableHeaderCellObject & { isSortable?: boolean })[] = [
  {
    key: "label",
    label: "Nom",
    isSortable: true,
  },
  {
    key: "organizationsCount",
    label: "Organisations liées",
  },
  {
    key: "applicationsCount",
    label: "Applications liées",
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
  if (isLoading.value) return "Chargement des directions métier…";
  const total = data.value.total;
  if (total === 0) return "Aucune donnée ne correspond à votre recherche : Résultat 0 à 0";
  const from = firstIndex.value + 1;
  const to = Math.min(firstIndex.value + data.value.results.length, total);
  return `Résultat ${from} à ${to} sur ${total}`;
});

async function fetchBusinessDivisions() {
  isLoading.value = true;

  const query = {
    label: searchQuery.value || undefined,
    page: currentPage.value,
    pageSize: itemsPerPage.value,
    sortBy: sortColumn.value,
    order: isSortDescending.value ? ("desc" as const) : ("asc" as const),
  };

  const response = await api.businessDivisionControllerFindAll({ query });
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
    await fetchBusinessDivisions();
  },
  { debounce: 300 },
);

watch([sortColumn, isSortDescending], () => {
  currentPage.value = 0;
  fetchBusinessDivisions();
});

const tableRows = computed(() =>
  data.value.results.map((businessDivision) => ({
    label: businessDivision.label,
    organizationsCount: businessDivision._count?.organizations ?? 0,
    applicationsCount: businessDivision._count?.applications ?? 0,
    actions: businessDivision,
  })),
);

function onSort(event: TableSortEvent) {
  sortColumn.value = event.sortField as (typeof headers)[number]["key"];
  isSortDescending.value = event.sortOrder === -1;
}

function onPage(event: { page: number; rows: number }) {
  currentPage.value = event.page;
  itemsPerPage.value = event.rows;
  fetchBusinessDivisions();
}

onMounted(fetchBusinessDivisions);
</script>

<template>
  <div class="header-row">
    <h1 class="fr-h1" data-testid="admin-business-divisions-title">Gestion des directions métier</h1>

    <BusinessDivisionActions @fetch-business-divisions="fetchBusinessDivisions" />
  </div>

  <div class="fr-mb-4w">
    <DsfrSearchBar
      v-model.trim="searchQuery"
      label="Rechercher une direction métier"
      placeholder="Rechercher par nom..."
      button-text="Rechercher"
      class="fr-col-12"
      data-testid="admin-business-division-search"
    />
  </div>

  <div aria-live="polite" aria-atomic="true" class="fr-sr-only" data-testid="admin-business-divisions-status">
    <p>{{ statusMessage }}</p>
  </div>

  <div v-if="isLoading" class="fr-alert fr-alert--info" data-testid="admin-business-divisions-loading">
    <p>Chargement des directions métier...</p>
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
      data-testid="admin-business-divisions-table"
      @sort="onSort"
      @page="onPage"
    >
      <template #body-actions="{ data: row }">
        <BusinessDivisionActions :business-division="row.actions" @fetch-business-divisions="fetchBusinessDivisions" />
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
