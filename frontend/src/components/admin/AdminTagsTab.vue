<script setup lang="ts">
import api from "@/api";
import type { TagDto } from "@/client/types.gen";
import RefAppTable from "@/components/RefAppTable.vue";
import type { TableColumn, TableSortEvent } from "@/types/table";
import type { DsfrDataTableHeaderCellObject } from "@gouvminint/vue-dsfr";
import { watchDebounced } from "@vueuse/core";
import { computed, onMounted, ref, watch } from "vue";
import TagActions from "./TagActions.vue";

// L'API renvoie le décompte des applications liées, non déclaré dans TagDto.
type TagRow = TagDto & { _count?: { applications: number } };
const data = ref<{ results: TagRow[]; total: number }>({ results: [], total: 0 });

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

// RGAA-084 (7.5) : message de statut sur le nombre de résultats, restitué aux TA.
const statusMessage = computed(() => {
  if (isLoading.value) return "Chargement des tags…";
  const total = data.value.total;
  if (total === 0) return "Aucune donnée ne correspond à votre recherche : Résultat 0 à 0";
  const from = firstIndex.value + 1;
  const to = Math.min(firstIndex.value + data.value.results.length, total);
  return `Résultat ${from} à ${to} sur ${total}`;
});

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
  if (!response.data) {
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
    await fetchTags();
  },
  { debounce: 300 },
);

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

  <div aria-live="polite" aria-atomic="true" class="fr-sr-only" data-testid="admin-tags-status">
    <p>{{ statusMessage }}</p>
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
