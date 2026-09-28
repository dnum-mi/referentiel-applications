<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { watchDebounced } from "@vueuse/core";
import type { HostingOptionWithUsageDto } from "@/client/types.gen";
import type { DsfrDataTableHeaderCellObject } from "@gouvminint/vue-dsfr";
import HostingOptionActions from "./HostingOptionActions.vue";
import api from "@/api";
import RefAppTable from "@/components/RefAppTable.vue";
import { useServerPaginatedTable } from "@/composables/use-server-paginated-table";
import type { TableColumn } from "@/types/table";

const ERR_LOAD_HOSTING_OPTIONS = "Erreur lors du chargement des plateformes d'hébergement";

const headers: (DsfrDataTableHeaderCellObject & { isSortable?: boolean })[] = [
  { key: "provider", label: "Fournisseur", isSortable: true },
  { key: "platform", label: "Plateforme", isSortable: true },
  { key: "site", label: "Site", isSortable: true },
  { key: "building", label: "Bâtiment", isSortable: true },
  { key: "room", label: "Pièce", isSortable: true },
  { key: "hostingsCount", label: "Hébergements rattachés" },
  { key: "actions", label: "Actions" },
] as const;

const tableColumns: TableColumn[] = headers.map((h) => ({
  field: h.key,
  header: h.label,
  sortable: h.isSortable || false,
}));

// Les actualisations gardent la table et les modals d'édition montés (#1830).
const searchQuery = ref("");
const {
  data,
  isLoading,
  hasLoadedOnce,
  hasError,
  itemsPerPage,
  firstIndex,
  sortColumn,
  isSortDescending,
  onSort,
  onPage,
  resetAndFetch,
  refresh: fetchHostingOptions,
  statusMessage: createStatusMessage,
} = useServerPaginatedTable<HostingOptionWithUsageDto>({
  fetchPage: async (pagination) => {
    const response = await api.hostingOptionControllerFindAll({
      query: { ...pagination, search: searchQuery.value || undefined },
    });
    if (!response.response.ok || !response.data) {
      throw response.error ?? new Error(ERR_LOAD_HOSTING_OPTIONS);
    }
    return response.data;
  },
});
const statusMessage = createStatusMessage("plateformes d'hébergement");

watchDebounced(searchQuery, resetAndFetch, { debounce: 300 });

const tableRows = computed(() =>
  data.value.results.map((option) => ({
    id: option.id,
    provider: option.provider,
    platform: option.platform,
    site: option.site,
    building: option.building || "-",
    room: option.room || "-",
    hostingsCount: option.hostingsCount,
    actions: option,
  })),
);

onMounted(fetchHostingOptions);
</script>

<template>
  <div>
    <div class="header-row">
      <h1 class="fr-h1" data-testid="admin-hosting-options-title">Gestion des plateformes d'hébergement</h1>

      <HostingOptionActions @fetch-hosting-options="fetchHostingOptions" />
    </div>

    <div class="fr-mb-4w">
      <DsfrSearchBar
        v-model.trim="searchQuery"
        label="Rechercher une plateforme d'hébergement"
        placeholder="Rechercher par fournisseur, plateforme, site, bâtiment ou pièce..."
        button-text="Rechercher"
        class="fr-col-12"
        data-testid="admin-hosting-option-search"
      />
    </div>

    <div aria-live="polite" aria-atomic="true" class="fr-sr-only" data-testid="admin-hosting-options-status">
      <p>{{ statusMessage }}</p>
    </div>

    <div v-if="hasError" class="fr-alert fr-alert--error fr-mb-2w" data-testid="admin-hosting-options-error">
      <p>{{ ERR_LOAD_HOSTING_OPTIONS }}</p>
    </div>

    <div v-if="isLoading && !hasLoadedOnce" class="fr-alert fr-alert--info" data-testid="admin-hosting-options-loading">
      <p>Chargement des plateformes d'hébergement...</p>
    </div>

    <div v-else-if="hasLoadedOnce">
      <RefAppTable
        :items="tableRows"
        :columns="tableColumns"
        data-key="id"
        :loading="isLoading"
        :paginator="true"
        :lazy="true"
        :rows="itemsPerPage"
        :first="firstIndex"
        :total-records="data.total"
        :sort-field="sortColumn"
        :sort-order="isSortDescending ? -1 : 1"
        data-testid="admin-hosting-options-table"
        @sort="onSort"
        @page="onPage"
      >
        <template #body-actions="{ data: row }">
          <HostingOptionActions :hosting-option="row.actions" @fetch-hosting-options="fetchHostingOptions" />
        </template>
      </RefAppTable>
    </div>
  </div>
</template>

<style scoped>
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
