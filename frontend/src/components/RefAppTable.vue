<script setup lang="ts">
import { ref, nextTick, watch } from "vue";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Skeleton from "primevue/skeleton";
import type { TableColumn, TableSortEvent } from "@/types/table";
import type { DataTableSortEvent, DataTablePageEvent } from "primevue/datatable";

export interface Props<T extends Record<string, any> = Record<string, any>> {
  items: T[];
  columns: TableColumn[];
  loading?: boolean;
  totalRecords?: number;
  rows?: number;
  first?: number;
  sortField?: string;
  sortOrder?: number;
  lazy?: boolean;
  paginator?: boolean;
  dataTestId?: string;
  emptyMessage?: string;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  totalRecords: 0,
  rows: 10,
  first: 0,
  sortField: undefined,
  sortOrder: 1,
  lazy: false,
  paginator: false,
  dataTestId: "ref-app-table",
  emptyMessage: "Aucune donnée ne correspond à votre recherche.",
});

const emit = defineEmits<{
  sort: [event: TableSortEvent];
  page: [event: DataTablePageEvent];
  columnResize: [event: { field: string; width: string }];
}>();

const internalSortField = ref(props.sortField);
const internalSortOrder = ref(props.sortOrder);
const isSorting = ref(false);
const skeletonTimeout = ref<number | null>(null);

watch([() => props.sortField, () => props.sortOrder], ([newField, newOrder]) => {
  internalSortField.value = newField;
  internalSortOrder.value = newOrder as number;
});

function onSort(event: DataTableSortEvent) {
  const scrollPos = window?.scrollY || 0;

  if (props.lazy) {
    if (skeletonTimeout.value) clearTimeout(skeletonTimeout.value);
    skeletonTimeout.value = window.setTimeout(() => {
      isSorting.value = true;
    }, 120);
  }

  const sortField = typeof event.sortField === "string" ? event.sortField : "";

  emit("sort", {
    sortField,
    sortOrder: event.sortOrder ?? 1,
  });

  if (window !== undefined) {
    nextTick(() => {
      requestAnimationFrame(() => window.scrollTo(0, scrollPos));
    });
  }
}

function onPage(event: DataTablePageEvent) {
  emit("page", event);
}

function onColumnResize(event: any) {
  if (event.element && event.element.style) {
    const field = event.element.getAttribute("data-p-column-field") || event.element.getAttribute("aria-label");
    const width = event.element.style.width;
    if (field && width) {
      emit("columnResize", { field, width });
    }
  }
}

watch(
  () => props.items,
  () => {
    if (skeletonTimeout.value) {
      clearTimeout(skeletonTimeout.value);
      skeletonTimeout.value = null;
    }
    isSorting.value = false;
  },
  { deep: true },
);
</script>

<template>
  <div class="fr-table" role="region" :aria-label="`Tableau de ${totalRecords} éléments`">
    <DataTable
      :value="items"
      :lazy="lazy"
      :total-records="totalRecords"
      :rows="rows"
      :first="first"
      :paginator="paginator"
      :rows-per-page-options="[5, 10, 15, 20, 50]"
      :paginator-template="'RowsPerPageDropdown FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport'"
      current-page-report-template="{first} à {last} sur {totalRecords}"
      :sort-field="internalSortField"
      :sort-order="internalSortOrder"
      :loading="loading && !isSorting"
      :data-testid="dataTestId"
      striped-rows
      resizable-columns
      column-resize-mode="fit"
      responsive-layout="scroll"
      aria-live="polite"
      :aria-busy="loading || isSorting"
      @sort="onSort"
      @page="onPage"
      @column-resize-end="onColumnResize"
      table-style="min-width: 50rem"
    >
      <template #empty>
        <div class="fr-py-2w fr-text--center" role="status" aria-live="polite">{{ emptyMessage }}</div>
      </template>

      <Column
        v-for="column in columns"
        :key="column.field"
        :field="column.field"
        :header="$slots[`header-${column.field}`] ? undefined : column.header"
        :sortable="column.sortable"
        :style="column.width ? { width: column.width } : undefined"
        :aria-label="column.header"
      >
        <template v-if="$slots[`header-${column.field}`]" #header>
          <slot :name="`header-${column.field}`" />
        </template>
        <template #body="slotProps">
          <Skeleton v-if="isSorting" width="80%" height="1rem" aria-label="Chargement en cours" />
          <slot v-else :name="`body-${column.field}`" v-bind="slotProps">
            {{ slotProps.data[column.field] }}
          </slot>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped>
:deep(.p-datatable) {
  font-family: inherit;
  width: 100%;
}

:deep(.p-datatable table) {
  width: 100%;
  border-collapse: collapse;
  border-spacing: 0;
  table-layout: auto;
}

:deep(.p-datatable-column-title > div > span) {
  color: var(--text-title-grey) !important;
}

:deep(.p-datatable-thead > tr > th) {
  background-color: var(--background-alt-grey) !important;
  font-weight: 700;
  padding: 1rem;
  text-align: left;
  border-bottom: 2px solid var(--border-default-grey);
  color: var(--text-default-grey) !important;
}

:deep(.p-datatable-tbody > tr) {
  border-bottom: 1px solid var(--border-default-grey);
  color: var(--text-default-grey);
  background-color: var(--background-default-grey) !important;
}

:deep(.p-datatable-tbody > tr:nth-child(even)) {
  background-color: var(--background-alt-grey) !important;
}

:deep(.p-datatable-tbody > tr > td) {
  padding: 1rem;
}

:deep(.p-datatable-tbody > tr:hover) {
  background-color: var(--background-default-grey-hover);
}

:deep(.p-datatable .p-sortable-column) {
  cursor: pointer;
}

:deep(.p-datatable .p-sortable-column.p-highlight) {
  color: var(--text-action-high-blue-france);
}

:deep(.p-datatable .p-sortable-column-icon) {
  margin-left: 0.5rem;
  color: var(--text-mention-grey);
  opacity: 1;
  visibility: visible;
}

:deep(.p-datatable-column-sorted .p-datatable-sort-icon) {
  color: var(--text-action-high-blue-france) !important;
  opacity: 1 !important;
  visibility: visible !important;
}

:deep(.p-datatable .p-sortable-column.p-highlight .p-sortable-column-icon) {
  color: var(--text-action-high-blue-france) !important;
  opacity: 1 !important;
  visibility: visible !important;
}

:deep(.p-skeleton) {
  background-color: var(--background-alt-grey);
  border-radius: 4px;
}
</style>
