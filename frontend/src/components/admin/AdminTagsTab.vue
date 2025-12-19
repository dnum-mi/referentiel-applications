<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import type { TagDto, TagsPaginatedResponseDto } from "@/client/types.gen";
import type { DsfrDataTableHeaderCellObject } from "@gouvminint/vue-dsfr";
import TagActions from "./TagActions.vue";
import api from "@/api";
import { debounce } from "@/utils/debouncer-utils";
import RefAppTable from "@/components/RefAppTable.vue";
import type { TableColumn, TableSortEvent } from "@/types/table";

const data = ref<TagsPaginatedResponseDto>({ results: [] as TagDto[], total: 0 });

const headers: (DsfrDataTableHeaderCellObject & { isSortable?: boolean })[] = [
  {
    key: "name",
    label: "Nom",
    isSortable: true,
  },
  {
    key: "createdAt",
    isSortable: true,
    label: "Date de création",
  },
  {
    key: "count",
    isSortable: false,
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

async function fetchTags() {
  isLoading.value = true;

  const query: Record<string, any> = {
    name: searchQuery.value || undefined,
    page: currentPage.value,
    pageSize: itemsPerPage.value,
    sortBy: sortColumn.value,
    order: isSortDescending.value ? "desc" : "asc",
  };

  const response = await api.tagsControllerFindAll({ query });
  data.value = response.data as TagsPaginatedResponseDto;

  isLoading.value = false;
}

const debouncedFetch = debounce(async () => {
  currentPage.value = 0;
  await fetchTags();
}, 300);

watch(searchQuery, () => {
  debouncedFetch();
});

watch([sortColumn, isSortDescending], () => {
  currentPage.value = 0;
  fetchTags();
});

const tableRows = computed(() =>
  data.value.results.map((tag) => ({
    name: tag.name,
    createdAt: tag.createdAt ? new Date(tag.createdAt).toLocaleString("fr-FR") : "",
    count: tag._count?.applications ?? 0,
    actions: tag,
  })),
);

function onSort(event: TableSortEvent) {
  sortColumn.value = event.sortField as (typeof headers)[number]["key"];
  isSortDescending.value = event.sortOrder === -1;
}

function onPage(event: any) {
  currentPage.value = event.page;
  itemsPerPage.value = event.rows;
  fetchTags();
}

onMounted(fetchTags);
</script>

<template>
  <div class="header-row">
    <h1 class="fr-h1" data-testid="admin-tags-title">Gestion des tags</h1>

    <TagActions @fetch-tags="fetchTags" :isCreating="true" />
  </div>

  <div class="fr-mb-4w">
    <DsfrSearchBar
      v-model.trim="searchQuery"
      label="Rechercher un tag"
      placeholder="Rechercher par nom..."
      button-text="Rechercher"
      class="fr-col-12"
      data-testid="admin-tag-search"
    />
  </div>

  <div v-if="isLoading" class="fr-alert fr-alert--info" data-testid="admin-tags-loading">
    <p>Chargement des tags...</p>
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
      data-testid="admin-tags-table"
      @sort="onSort"
      @page="onPage"
    >
      <template #body-actions="{ data }">
        <TagActions :tag="data.actions" @fetch-tags="fetchTags" />
      </template>
    </RefAppTable>
  </div>
</template>

<style scoped>
.truncate {
  display: inline-block;
  max-width: 60ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
