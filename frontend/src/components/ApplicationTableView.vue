<script setup lang="ts">
import { computed, watch, ref } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";
import { restartPrioritiesConfig } from "@/composables/use-dictionary";
import PaginationFooter from "./PaginationFooter.vue";

const searchStore = useApplicationSearchStore();

const sortBy = ref(searchStore.filters.sortBy || "label");
const sortedDesc = ref(searchStore.filters.order === "desc");

const lastValidColumn = ref(sortBy.value);

const columnToFieldMap: Record<string, string> = {
  IQ: "quality",
  Nom: "label",
  Priorité: "priorityRestart",
  Hébergement: "hostingSite",
  Tags: "tag",
};

const pages = computed(() => {
  const totalPages = Math.ceil(searchStore.total / (searchStore.limit ?? searchStore.initialFilters.limit));
  return Array.from({ length: totalPages }).map((_, i) => ({
    label: String(i + 1),
    title: `Page ${i + 1}`,
    href: `#page-${i + 1}`,
  }));
});

watch(
  [sortBy, sortedDesc],
  ([col, desc]) => {
    let actualColumn = col;
    if (!col) {
      actualColumn = lastValidColumn.value;
      sortBy.value = actualColumn;
    } else {
      lastValidColumn.value = col;
    }

    const sortField = columnToFieldMap[actualColumn] || actualColumn;
    const orderValue = desc === true ? "desc" : "asc";

    searchStore.setFilter({ sortBy: sortField, order: orderValue });
  },
  {
    flush: "post",
  },
);

const rows = computed(() => {
  const rows = searchStore.results.map((app: any) => ({
    IQ: { value: app.quality !== null ? `${app.quality}%` : "0%" },
    Nom: app,
    Priorité: app,
    Hébergement: {
      hosting:
        app.hostings
          ?.map((h: any) => {
            const site = h.hostingOption?.site || h.site || "";
            const building = h.hostingOption?.building || "";
            const room = h.hostingOption?.room || "";

            const parts = [site, building, room].filter(Boolean);
            return parts.length ? parts.join(" - ") : "-";
          })
          .join(", ") || "-",
    },
    Tags: {
      tags: app.tags?.join(", ") || "-",
    },
  }));
  if (searchStore.filters.order === "desc") {
    rows.reverse();
  }
  return rows;
});

function updateSortedColumn(key: string | undefined) {
  searchStore.setFilter({ sortBy: key || "label", page: 0 });
}
</script>

<template>
  <DsfrDataTable
    v-model:sorted-by="sortBy"
    v-model:sorted-desc="sortedDesc"
    title="Liste des applications"
    no-caption
    :headers-row="['IQ', 'Nom', 'Priorité', 'Hébergement', 'Tags']"
    :rows="rows"
    sortable-rows
    vertical-borders
    :pagination="false"
    data-testid="application-table"
    @update:sorted-by="updateSortedColumn"
    @update:sorted-desc="searchStore.setOrder"
  >
    <template #cell="{ colKey, cell }">
      <template v-if="colKey === 'Nom'">
        <router-link
          :to="{ name: 'application', params: { id: cell.id } }"
          class="truncate"
          :data-testid="`application-row-${cell.id}-link`"
        >
          {{ cell.label }}
        </router-link>
      </template>

      <template v-else-if="colKey === 'Priorité'">
        <DsfrBadge
          v-if="cell.priorityRestart"
          :label="restartPrioritiesConfig[cell.priorityRestart].shortLabel"
          :type="restartPrioritiesConfig[cell.priorityRestart].type"
          :title="restartPrioritiesConfig[cell.priorityRestart].tooltip"
          :data-testid="`application-row-${cell.id}-priority`"
        />
        <span v-else>-</span>
      </template>

      <template v-else>
        <span
          class="truncate"
          :data-testid="`application-row-${cell.id}-${colKey === 'Hébergement' ? 'hosting' : colKey === 'Tags' ? 'tags' : 'iq'}`"
        >
          {{ Object.values(cell)[0] }}
        </span>
      </template>
    </template>
  </DsfrDataTable>

  <PaginationFooter
    :total-filtered="searchStore.total ?? 0"
    :pages="pages"
    :limit="searchStore.limit ?? 0"
    :page="searchStore.page ?? 0"
    data-testid="application-pagination-footer"
    @update:limit="searchStore.limit = $event"
    @update:page="searchStore.page = $event"
  />
</template>

<style scoped>
.truncate {
  display: inline-block;
  max-width: 80vh;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.export-button {
  margin-bottom: 10px;
}
</style>
