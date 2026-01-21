<script setup lang="ts">
import { computed, ref } from "vue";
import { useApplicationSearch } from "@/composables/use-application-search";
import { restartPrioritiesConfig } from "@/composables/use-dictionary";
import RefAppTable from "./RefAppTable.vue";
import type { TableColumn, TableSortEvent } from "@/types/table";

const { filters, results, total, page, pageSize, setFilter, isLoading } = useApplicationSearch();

// Calcul essentiel pour PrimeVue : (Page 0 -> 0, Page 1 -> 15, Page 2 -> 30...)
const firstIndex = computed(() => page.value * pageSize.value);

const sortField = ref(filters.value.sortBy || "label");
const sortOrder = ref(filters.value.order === "desc" ? -1 : 1);

const columns: TableColumn[] = [
  { field: "quality", header: "IQ", sortable: true, width: "80px" },
  { field: "label", header: "Nom", sortable: true, width: "300px" },
  { field: "priorityRestart", header: "Priorité", sortable: true, width: "160px" },
  { field: "hostingDisplay", header: "Hébergement", sortable: false, width: "280px" },
  { field: "tag", header: "Tags", sortable: false, width: "240px" },
];

const applications = computed(() =>
  results.value.map((app: any) => ({
    ...app,
    qualityDisplay: app.quality !== null ? `${app.quality}%` : "0%",
    hostingDisplay: app.hostings?.map((h: any) => h.hostingOption?.site || h.site).join(", ") || "-",
    tagsDisplay: app.tags?.map((tag: any) => tag.name).join(", ") || "-",
    priorityConfig: app.priorityRestart ? restartPrioritiesConfig[app.priorityRestart as keyof typeof restartPrioritiesConfig] : null,
  })),
);

function onSort(event: TableSortEvent) {
  sortField.value = event.sortField || "label";
  sortOrder.value = event.sortOrder || 1;

  setFilter({
    sortBy: sortField.value,
    order: sortOrder.value === -1 ? "desc" : "asc",
    page: 0, // Reset to first page when sorting
  });
}

function onPage(event: any) {
  // event.page is 0-indexed from PrimeVue, and the API also expects 0-indexed pages
  setFilter({
    page: event.page,
    pageSize: event.rows,
  });
}
</script>

<template>
  <RefAppTable
    :items="applications"
    :columns="columns"
    :loading="isLoading"
    :lazy="true"
    :paginator="true"
    :total-records="total"
    :sort-field="sortField"
    :sort-order="sortOrder"
    :rows="pageSize"
    :first="firstIndex"
    data-test-id="application-table"
    @sort="onSort"
    @page="onPage"
  >
    <template #body-quality="{ data }">
      {{ data.qualityDisplay }}
    </template>

    <template #body-label="{ data }">
      <router-link :to="{ name: 'application', params: { id: data.id } }">
        {{ data.label }}
      </router-link>
    </template>

    <template #body-priorityRestart="{ data }">
      <DsfrBadge v-if="data.priorityConfig" :label="data.priorityConfig.shortLabel" :type="data.priorityConfig.type" />
      <span v-else>-</span>
    </template>
  </RefAppTable>
</template>

<style scoped>
.truncate {
  display: inline-block;
  max-width: 80vh;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
}
</style>
