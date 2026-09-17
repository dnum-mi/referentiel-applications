<script setup lang="ts">
import api from "@/api";
import type { OrganizationDto } from "@/client/types.gen";
import RefAppTable from "@/components/RefAppTable.vue";
import { useServerPaginatedTable } from "@/composables/use-server-paginated-table";
import type { TableColumn } from "@/types/table";
import type { DsfrDataTableHeaderCellObject } from "@gouvminint/vue-dsfr";
import { watchDebounced } from "@vueuse/core";
import { computed, onMounted, ref } from "vue";
import OrganizationActions from "./OrganizationActions.vue";

type OrganizationWithMaiaReferences = OrganizationDto & {
  maiaReferences?: Array<{ maiaRef: string }>;
};

const headers: (DsfrDataTableHeaderCellObject & { isSortable?: boolean })[] = [
  {
    key: "path",
    label: "Chemin",
    isSortable: true,
  },
  {
    key: "maiaReferences",
    label: "Refs MAIA",
    isSortable: false,
  },
  {
    key: "sigle",
    label: "Sigle",
    isSortable: true,
  },
  {
    key: "businessDivision",
    label: "Direction métier",
    isSortable: false,
  },
  {
    key: "url",
    label: "URL",
    isSortable: false,
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
  refresh: fetchOrganizations,
  statusMessage: createStatusMessage,
} = useServerPaginatedTable<OrganizationDto>({
  initialSortColumn: "path",
  fetchPage: async (pagination) => {
    const response = await api.organizationsControllerFindAll({
      query: { ...pagination, search: searchQuery.value || undefined },
    });
    return response.data;
  },
});
const statusMessage = createStatusMessage("organisations");

watchDebounced(searchQuery, resetAndFetch, { debounce: 300 });

const tableRows = computed(() =>
  data.value.results.map((organization) => {
    const organizationWithReferences = organization as OrganizationWithMaiaReferences;
    const maiaReferences =
      organizationWithReferences.maiaReferences
        ?.map((reference) => reference.maiaRef)
        .sort((a, b) => a.localeCompare(b, "fr"))
        .join(", ") || "-";

    return {
      path: organization.path,
      maiaReferences,
      sigle: organization.sigle || "-",
      businessDivision: organization.businessDivision?.label || "-",
      url: organization.url || "-",
      actions: organization,
    };
  }),
);

onMounted(fetchOrganizations);
</script>

<template>
  <div class="header-row">
    <h1 class="fr-h1" data-testid="admin-organizations-title">Gestion des organisations</h1>

    <OrganizationActions @fetch-organizations="fetchOrganizations" />
  </div>

  <div class="fr-mb-4w">
    <DsfrSearchBar
      v-model.trim="searchQuery"
      label="Rechercher une organisation"
      placeholder="Rechercher par chemin..."
      button-text="Rechercher"
      class="fr-col-12"
      data-testid="admin-organizations-search"
    />
  </div>

  <div aria-live="polite" aria-atomic="true" class="fr-sr-only" data-testid="admin-organizations-status">
    <p>{{ statusMessage }}</p>
  </div>

  <div v-if="isLoading" class="fr-alert fr-alert--info" data-testid="admin-organizations-loading">
    <p>Chargement des organisations...</p>
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
      data-testid="admin-organizations-table"
      @sort="onSort"
      @page="onPage"
    >
      <template #body-actions="{ data: row }">
        <OrganizationActions :organization="row.actions" @fetch-organizations="fetchOrganizations" />
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
