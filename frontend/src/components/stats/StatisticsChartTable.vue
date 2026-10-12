<script setup lang="ts">
import { computed, ref } from "vue";
import type { TableColumn } from "@/types/table";

const props = defineProps<{ rows: Record<string, string | number>[]; columns: TableColumn[]; caption: string; id: string }>();
const sort = ref<{ field: string; direction: 1 | -1 } | null>(null);
const sortedRows = computed(() => {
  const current = sort.value;
  if (!current) return props.rows;
  return [...props.rows].sort((a, b) => {
    const first = a[current.field];
    const second = b[current.field];
    const comparison =
      typeof first === "number" && typeof second === "number"
        ? first - second
        : String(first).localeCompare(String(second), "fr", { numeric: true });
    return comparison * current.direction;
  });
});
function sortBy(field: string) {
  sort.value = { field, direction: sort.value?.field === field && sort.value.direction === 1 ? -1 : 1 };
}
</script>

<template>
  <section :id="id" class="fr-table statistics-table" :aria-label="caption" tabindex="0">
    <table>
      <caption>
        {{
          caption
        }}
      </caption>
      <thead>
        <tr>
          <th
            v-for="column in columns"
            :key="column.field"
            scope="col"
            :aria-sort="
              column.sortable ? (sort?.field === column.field ? (sort.direction === 1 ? 'ascending' : 'descending') : 'none') : undefined
            "
          >
            <button
              v-if="column.sortable"
              type="button"
              class="sort-button"
              @click="sortBy(column.field)"
              :aria-label="`${column.header} : trier par ordre ${sort?.field === column.field && sort.direction === 1 ? 'décroissant' : 'croissant'}`"
            >
              {{ column.header }}
              <span aria-hidden="true">{{ sort?.field === column.field ? (sort.direction === 1 ? "↑" : "↓") : "↕" }}</span>
            </button>
            <template v-else>{{ column.header }}</template>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, rowIndex) in sortedRows" :key="rowIndex">
          <template v-for="(column, columnIndex) in columns" :key="column.field">
            <th v-if="columnIndex === 0" scope="row">{{ row[column.field] }}</th>
            <td v-else>{{ row[column.field] }}</td>
          </template>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.statistics-table {
  max-width: 100%;
  overflow: auto;
}
.statistics-table > table {
  display: table;
  overflow: visible;
  width: 100%;
}
.statistics-table caption {
  text-align: left;
  font-weight: 700;
  margin-bottom: 1rem;
}
.statistics-table th,
.statistics-table td {
  white-space: normal;
  overflow-wrap: anywhere;
}
.sort-button {
  display: inline-flex;
  gap: 0.5rem;
  text-align: left;
  padding: 0.5rem;
  font-weight: inherit;
}
</style>
