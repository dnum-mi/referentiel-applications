<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { watchDebounced } from "@vueuse/core";
import type { LabelSourceDto } from "@/client/types.gen";
import type { DsfrDataTableHeaderCellObject } from "@gouvminint/vue-dsfr";
import LabelSourceActions from "./LabelSourceActions.vue";
import api from "@/api";
import RefAppTable from "@/components/RefAppTable.vue";
import { useServerPaginatedTable } from "@/composables/use-server-paginated-table";
import type { TableColumn } from "@/types/table";

// L'API renvoie le décompte des labels liés, non déclaré dans LabelSourceDto.
type LabelSourceRow = LabelSourceDto & { _count?: { Label: number } };

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
  refresh: fetchLabelSources,
  statusMessage: createStatusMessage,
} = useServerPaginatedTable<LabelSourceRow>({
  fetchPage: async (pagination) => {
    const response = await api.labelSourceControllerFindAll({
      query: { ...pagination, source: searchQuery.value || undefined },
    });
    return response.data?.results ? response.data : undefined;
  },
});
const statusMessage = createStatusMessage("sources de noms alternatifs");

watchDebounced(searchQuery, resetAndFetch, { debounce: 300 });

const tableRows = computed(() =>
  data.value.results.map((labelSource) => ({
    source: labelSource.source,
    count: labelSource._count?.Label ?? 0,
    actions: labelSource,
  })),
);

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
