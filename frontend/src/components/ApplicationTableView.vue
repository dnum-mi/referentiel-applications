<script setup lang="ts">
import { computed, watch } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";
import { useStatisticsStore } from "@/stores/statisticsStore";
import { getPriorityBadgeType } from "@/composables/use-dictionary";
import { customSorter } from "@/utils/tableSort";
import { applicationFieldsDict } from "@/composables/use-dictionary";
import PaginationFooter from "./PaginationFooter.vue";

const searchStore = useApplicationSearchStore();
const statsStore = useStatisticsStore();

const currentSortedColumn = defineModel("sortedBy", { default: "label" });

const sortOrder = computed({
  get: () => searchStore.filters.order,
  set: (val: "asc" | "desc") => searchStore.setFilter("order", val),
});

const columnToFieldMap: Record<string, string> = {
  "Nom court": "shortName",
  Description: "description",
  "Priorité de redémarrage": "priorityRestart",
  Hébergement: "hostingSite",
  Tags: "tag",
};

const pages = computed(() => {
  const totalPages = Math.ceil(searchStore.total / searchStore.limit);
  return Array.from({ length: totalPages }).map((_, i) => ({
    label: String(i + 1),
    title: `Page ${i + 1}`,
    href: `#page-${i + 1}`,
  }));
});

watch(currentSortedColumn, (col) => {
  const sortField = columnToFieldMap[col] || "label";
  searchStore.setFilter("sortBy", sortField);
  searchStore.setFilter("page", 0);
  searchStore.searchApplications();
});

watch(sortOrder, () => {
  searchStore.setFilter("page", 0);
  searchStore.searchApplications();
});

const rows = computed(() =>
  searchStore.results.map((app: any) => ({
    "Nom court": app,
    Description: app,
    "Priorité de redémarrage": app,
    Hébergement: {
      hosting: (app.hostings || []).map((h: any) => h.site || "").join(", ") || "-",
    },
    Tags: {
      tags: app.tags?.join(", ") || "-",
    },
  })),
);

function sorter(a: any, b: any, columnIndex: number) {
  const col = currentSortedColumn.value;
  return customSorter(a, b, col, applicationFieldsDict);
}
</script>

<template>
  <div>
    <DsfrDataTable
      :headers-row="['Nom court', 'Description', 'Priorité de redémarrage', 'Hébergement', 'Tags']"
      :rows="rows"
      :sortFn="sorter"
      sortable-rows
      vertical-borders
      :pagination="false"
      v-model:sortedBy="currentSortedColumn"
      v-model:sortOrder="sortOrder"
    >
      <template #cell="{ colKey, cell }">
        <template v-if="colKey === 'Nom court'">
          <router-link :to="{ name: 'application', params: { id: cell.id } }" class="truncate">
            {{ cell.shortName?.length ? cell.shortName : cell.label }}
          </router-link>
        </template>

        <template v-else-if="colKey === 'Description'">
          <span class="truncate">{{ cell.description }}</span>
        </template>

        <template v-else-if="colKey === 'Priorité de redémarrage'">
          <DsfrBadge
            :label="getPriorityBadgeType(cell.priorityRestart).label"
            :type="getPriorityBadgeType(cell.priorityRestart).type"
            :title="getPriorityBadgeType(cell.priorityRestart).tooltip"
          />
        </template>

        <template v-else>
          <span class="truncate">{{ Object.values(cell)[0] }}</span>
        </template>
      </template>
    </DsfrDataTable>

    <PaginationFooter
      :totalFiltered="searchStore.total"
      :totalAll="statsStore.totalApplications"
      :pages="pages"
      :limit="searchStore.limit"
      :page="searchStore.page"
      @update:limit="searchStore.limit = $event"
      @update:page="searchStore.page = $event"
    />
  </div>
</template>

<style scoped>
.truncate {
  display: inline-block;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
