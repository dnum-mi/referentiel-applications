<script setup lang="ts">
import api from "@/api";
import type { TagDto } from "@/client/types.gen";
import RefAppTable from "@/components/RefAppTable.vue";
import { useServerPaginatedTable } from "@/composables/use-server-paginated-table";
import type { TableColumn } from "@/types/table";
import type { DsfrDataTableHeaderCellObject } from "@gouvminint/vue-dsfr";
import { watchDebounced } from "@vueuse/core";
import { computed, onMounted, ref } from "vue";
import TagActions from "./TagActions.vue";

// L'API renvoie le décompte des applications liées, non déclaré dans TagDto.
type TagRow = TagDto & { _count?: { applications: number } };

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
  refresh: fetchTags,
  statusMessage: createStatusMessage,
} = useServerPaginatedTable<TagRow>({
  fetchPage: async (pagination) => {
    const response = await api.tagsControllerFindAll({
      query: { ...pagination, name: searchQuery.value || undefined },
    });
    return response.data;
  },
});
const statusMessage = createStatusMessage("tags");

watchDebounced(searchQuery, resetAndFetch, { debounce: 300 });

const tableRows = computed(() =>
  data.value.results.map((tag) => ({
    name: tag.name,
    createdAt: tag.createdAt ? new Date(tag.createdAt).toLocaleString("fr-FR") : "",
    count: tag._count?.applications ?? 0,
    actions: tag,
  })),
);

onMounted(fetchTags);
</script>

<template>
  <div class="header-row">
    <h1 class="fr-h1" data-testid="admin-tags-title">Gestion des tags</h1>

    <TagActions @fetch-tags="fetchTags" :is-creating="true" />
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
      <template #body-actions="{ data: row }">
        <TagActions :tag="row.actions" @fetch-tags="fetchTags" />
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
