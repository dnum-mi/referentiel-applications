<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { watchDebounced } from "@vueuse/core";
import type { BusinessDivisionDto } from "@/client/types.gen";
import type { DsfrDataTableHeaderCellObject } from "@gouvminint/vue-dsfr";
import BusinessDivisionActions from "./BusinessDivisionActions.vue";
import api from "@/api";
import RefAppTable from "@/components/RefAppTable.vue";
import { useServerPaginatedTable } from "@/composables/use-server-paginated-table";
import type { TableColumn } from "@/types/table";

// L'API renvoie le décompte des liaisons, non déclaré dans BusinessDivisionDto.
type BusinessDivisionRow = BusinessDivisionDto & { _count?: { organizations: number; applications: number } };

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

const searchQuery = ref("");
const {
  data,
  isLoading,
  itemsPerPage,
  firstIndex,
  sortColumn,
  isSortDescending,
  onSort,
  onPage,
  resetAndFetch,
  refresh: fetchBusinessDivisions,
  statusMessage: createStatusMessage,
} = useServerPaginatedTable<BusinessDivisionRow>({
  fetchPage: async (pagination) => {
    const response = await api.businessDivisionControllerFindAll({
      query: { ...pagination, label: searchQuery.value || undefined },
    });
    return response.data?.results ? response.data : undefined;
  },
});
const statusMessage = createStatusMessage("directions métier");

watchDebounced(searchQuery, resetAndFetch, { debounce: 300 });

const tableRows = computed(() =>
  data.value.results.map((businessDivision) => ({
    label: businessDivision.label,
    organizationsCount: businessDivision._count?.organizations ?? 0,
    applicationsCount: businessDivision._count?.applications ?? 0,
    actions: businessDivision,
  })),
);

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
