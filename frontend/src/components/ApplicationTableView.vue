<script setup lang="ts">
import { computed } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";
import { getPriorityBadgeType } from "@/composables/use-dictionary";
import { customSorter } from "@/utils/tableSort";
import { applicationFieldsDict } from "@/composables/use-dictionary";

const searchStore = useApplicationSearchStore();

const currentSortedColumn = defineModel("sortedBy", { default: "label" });

const rows = computed(() =>
  searchStore.results.map((app) => ({
    "Nom court": app,
    Description: app,
    "Priorité de redémarrage": app,
    Hébergement: { hosting: app.hostingSummary || "-" },
    Tags: { tags: app.tags?.join(", ") || "-" },
  })),
);

function sorter(a: any, b: any, columnIndex: number) {
  return customSorter(a, b, currentSortedColumn.value, applicationFieldsDict);
}
</script>

<template>
  <DsfrDataTable
    :headers-row="['Nom court', 'Description', 'Priorité de redémarrage', 'Hébergement', 'Tags']"
    :rows="rows"
    v-model:current-page="searchStore.page"
    v-model:rows-per-page="searchStore.limit"
    pagination
    :pagination-options="[5, 15, 30, 50, 100]"
    sortable-rows
    :sortFn="sorter"
    v-model:sortedBy="currentSortedColumn"
    vertical-borders
  >
    <!-- Ligne personnalisée avec transition -->
    <template #cell="{ colKey, cell }">
      <transition-group name="fade-slide" tag="div">
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
      </transition-group>
    </template>
  </DsfrDataTable>
</template>

<style scoped>
.fade-slide-enter-active {
  transition: all 0.3s ease;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(5px);
}
.fade-slide-enter-to {
  opacity: 1;
  transform: translateY(0);
}
</style>
