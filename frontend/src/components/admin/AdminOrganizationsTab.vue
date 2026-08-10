<script setup lang="ts">
import api from "@/api";
import type { OrganizationDto, PaginatedOrganizationDto } from "@/client/types.gen";
import RefAppTable from "@/components/RefAppTable.vue";
import type { TableColumn, TableSortEvent } from "@/types/table";
import type { DsfrDataTableHeaderCellObject } from "@gouvminint/vue-dsfr";
import { watchDebounced } from "@vueuse/core";
import { computed, onMounted, ref, watch } from "vue";
import OrganizationActions from "./OrganizationActions.vue";

const data = ref<PaginatedOrganizationDto>({ results: [], total: 0 });

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

const isLoading = ref(false);
const searchQuery = ref("");

const sortColumn = ref<(typeof headers)[number]["key"]>("path");
const isSortDescending = ref(false);

const itemsPerPage = ref(15);
const currentPage = ref(0);
const firstIndex = computed(() => currentPage.value * itemsPerPage.value);

async function fetchOrganizations() {
  isLoading.value = true;

  const query: Record<string, any> = {
    search: searchQuery.value || undefined,
    page: currentPage.value,
    pageSize: itemsPerPage.value,
    sortBy: sortColumn.value,
    order: isSortDescending.value ? "desc" : "asc",
  };

  const response = await api.organizationsControllerFindAll({ query });
  if (!response.data) {
    isLoading.value = false;
    return;
  }

  data.value = response.data;
  isLoading.value = false;
}

async function refreshOrganizationsTab() {
  await fetchOrganizations();
}

watchDebounced(
  searchQuery,
  async () => {
    currentPage.value = 0;
    await fetchOrganizations();
  },
  { debounce: 300 },
);

watch([sortColumn, isSortDescending], () => {
  currentPage.value = 0;
  fetchOrganizations();
});

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

function onSort(event: TableSortEvent) {
  sortColumn.value = event.sortField as (typeof headers)[number]["key"];
  isSortDescending.value = event.sortOrder === -1;
}

function onPage(event: any) {
  currentPage.value = event.page;
  itemsPerPage.value = event.rows;
  fetchOrganizations();
}

onMounted(refreshOrganizationsTab);
</script>

<template>
  <div class="header-row">
    <h1 class="fr-h1" data-testid="admin-organizations-title">Gestion des organisations</h1>

    <OrganizationActions @fetch-organizations="refreshOrganizationsTab" />
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
      <template #body-actions="{ data }">
        <OrganizationActions :organization="data.actions" @fetch-organizations="refreshOrganizationsTab" />
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
