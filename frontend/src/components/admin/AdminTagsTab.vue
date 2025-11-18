<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import type { TagsPaginatedResponseDto } from "@/client/types.gen";
import PaginationFooter from "../PaginationFooter.vue";
import type { DsfrDataTableHeaderCellObject } from "@gouvminint/vue-dsfr";
import TagActions from "./TagActions.vue";
import { useTagStore } from "@/stores/tagStore";

const errorMessages = {
  ERR_LOAD_TAGS: "Erreur lors du chargement des tags",
} as const;

type ErrorKey = keyof typeof errorMessages;

const data = ref<TagsPaginatedResponseDto>({ results: [], total: 0 });

const tagStore = useTagStore();

const headers: (DsfrDataTableHeaderCellObject & { isSortable?: boolean })[] = [{
  key: "name",
  label: "Nom",
  isSortable: true,
}, {
  key: "createdAt",
  isSortable: true,
  label: "Date de création",
}, {
  key: "count",
  isSortable: false,
  label: "Applications liées",
}, {
  key: "actions",
  label: "Actions",
}] as const;

const isLoading = ref(false);
const errorKeySet = ref<Set<ErrorKey>>(new Set());
const searchQuery = ref("");

const sortColumn = ref<typeof headers[number]["key"]>();
const isSortDescending = ref<boolean>(false);

const itemsPerPage = ref<number>(15);
const currentPage = ref<number>(0);

async function fetchTags() {
  try {
    isLoading.value = true;

    const query: Record<string, any> = {
      name: searchQuery.value || undefined,
      page: currentPage.value,
      pageSize: itemsPerPage.value,
      sortBy: sortColumn.value,
      order: isSortDescending.value ? "desc" : "asc",
    };
  
    const response = await tagStore.find(query);
    data.value = response;
    errorKeySet.value.delete("ERR_LOAD_TAGS");
  } catch (err) {
    errorKeySet.value.add("ERR_LOAD_TAGS");
    console.error(err);
  } finally {
    isLoading.value = false;
  }
}

let searchDebounceTimeout: number | undefined;
watch(searchQuery, async (newValue) => {
  if (searchDebounceTimeout) window.clearTimeout(searchDebounceTimeout);
  searchDebounceTimeout = window.setTimeout(async () => {
    if (searchQuery.value === newValue) {
      currentPage.value = 0;
      await fetchTags();
    }
  }, 300);
});

watch([sortColumn, isSortDescending], () => {
  currentPage.value = 0;
  fetchTags();
});

const tableRows = computed(() =>
  data.value.results.map(tag => ({
    name: tag.name,
    createdAt: tag.createdAt ? new Date(tag.createdAt).toLocaleString("fr-FR") : "",
    count: tag._count?.applications ?? 0,
    actions: tag,
  })),
);

function onUpdateSortColumn(columnName: string | undefined) {
  sortColumn.value = columnName;
}

function updateItemsPerPage(value: number) {
  itemsPerPage.value = value;
  currentPage.value = 0;
  fetchTags();
}
function updatePage(value: number) {
  currentPage.value = value;
  fetchTags();
}

onMounted(fetchTags);
</script>

<template>
  <div>
      <h1 class="fr-h1" data-testid="admin-tags-title">
        Gestion des tags
      </h1>

      <TagActions :tag="{}" @tag-updated="fetchTags" :isCreating="true" />

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

    <div v-else-if="errorKeySet.size" class="fr-alert fr-alert--error" data-testid="admin-tags-error">
      <p v-for="errorKey in Array.from(errorKeySet.keys())" :key="errorKey">
        {{ errorMessages[errorKey] }}
      </p>
    </div>

    <div v-else>
      <DsfrDataTable
        :key="`${currentPage}-${itemsPerPage}-${sortColumn}-${isSortDescending}`"
        v-model:sorted-by="sortColumn"
        v-model:sorted-desc="isSortDescending"
        :sort-fn="(a, b) => (isSortDescending ? -1 : 1)"
        title="Tags"
        no-caption
        :headers-row="headers"
        :rows="tableRows"
        row-key="name"
        :sortable-rows="headers.filter(h => h.isSortable).map(h => h.key)"
        vertical-borders
        :pagination="false"
        data-testid="admin-tags-table"
        @update:sorted-by="onUpdateSortColumn"
      >
        <template #header="header">
          <DsfrTableHeader
            :header="header.label"
            :aria-sort="isSortDescending ? 'descending' : 'ascending'"
          />
        </template>
        <template #cell="{ colKey, cell }">
          <template v-if="colKey === 'actions'">
            <TagActions :tag="cell" @tag-updated="fetchTags" />
          </template>

          <template v-else>
            <span class="truncate">{{ cell }}</span>
          </template>
        </template>
      </DsfrDataTable>
      <PaginationFooter
        :total-filtered="data.total"
        :limit="itemsPerPage"
        :page="currentPage"
        data-testid="admin-tags-pagination-footer"
        @update:limit="updateItemsPerPage"
        @update:page="updatePage"
      />
    </div>
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
</style>
