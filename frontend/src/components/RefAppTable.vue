<script setup lang="ts" generic="T">
import { ref, nextTick, watch } from "vue";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Skeleton from "primevue/skeleton";
import type { TableColumn, TableSortEvent } from "@/types/table";
import type { DataTableSortEvent, DataTablePageEvent, DataTableColumnResizeEndEvent } from "primevue/datatable";

export interface Props<T> {
  items: T[];
  columns: TableColumn[];
  /**
   * Champ identifiant de ligne, transmis au `dataKey` PrimeVue. Sans lui, les lignes sont
   * keyées par INDEX : lors d'un refetch qui réordonne/filtre, les composants des cellules
   * (modals inclus) sont réutilisés avec les données d'une AUTRE ligne (#1830). À fournir
   * dès qu'un slot de cellule porte un état local.
   */
  dataKey?: string;
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
  /** Affiche une colonne de sélection multiple (cases à cocher) — nécessite `dataKey`. */
  selectable?: boolean;
}

const props = withDefaults(defineProps<Props<T>>(), {
  dataKey: undefined,
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
  selectable: false,
});

const emit = defineEmits<{
  sort: [event: TableSortEvent];
  page: [event: DataTablePageEvent];
  columnResize: [event: { field: string; width: string }];
}>();

const selection = defineModel<T[]>("selection", { default: () => [] });

const internalSortField = ref(props.sortField);
const internalSortOrder = ref(props.sortOrder);
const isSorting = ref(false);
const skeletonTimeout = ref<number | null>(null);

watch([() => props.sortField, () => props.sortOrder], ([newField, newOrder]) => {
  internalSortField.value = newField;
  internalSortOrder.value = newOrder as number;
});

function applySort(sortField: string, sortOrder: number) {
  const scrollPos = window?.scrollY || 0;

  if (props.lazy) {
    if (skeletonTimeout.value) clearTimeout(skeletonTimeout.value);
    skeletonTimeout.value = window.setTimeout(() => {
      isSorting.value = true;
    }, 120);
  }

  emit("sort", { sortField, sortOrder });

  if (window !== undefined) {
    nextTick(() => {
      requestAnimationFrame(() => window.scrollTo(0, scrollPos));
    });
  }
}

function onSort(event: DataTableSortEvent) {
  const sortField = typeof event.sortField === "string" ? event.sortField : "";
  applySort(sortField, event.sortOrder ?? 1);
}

// RGAA-027 : le tri est déclenché depuis le bouton interne de l'en-tête (PrimeVue ignore les clics
// dont la cible est « cliquable »). On bascule croissant ⇄ décroissant sur la colonne visée.
function requestSort(column: TableColumn) {
  const nextOrder = internalSortField.value === column.field && internalSortOrder.value === 1 ? -1 : 1;
  applySort(column.field, nextOrder);
}

function onPage(event: DataTablePageEvent) {
  emit("page", event);
}

// RGAA-027 : intitulé du bouton de tri décrivant le libellé + l'état/action de tri.
function sortTitle(column: TableColumn): string {
  if (internalSortField.value !== column.field) {
    return `${column.header} - Trier par ordre croissant`;
  }
  return internalSortOrder.value === -1 ? `${column.header} - Tri descendant` : `${column.header} - Tri ascendant`;
}

function onColumnResize(event: DataTableColumnResizeEndEvent) {
  if (event.element && event.element.style) {
    const field = event.element.dataset.pColumnField || event.element.getAttribute("aria-label");
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
  <section class="fr-table" :aria-label="`Tableau de ${totalRecords} éléments`">
    <DataTable
      v-model:selection="selection"
      :value="items"
      :data-key="dataKey"
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
      :pt="{ column: { headerCell: { tabindex: null } } }"
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
        <output class="fr-py-2w fr-text--center" aria-live="polite" style="display: block">{{ emptyMessage }}</output>
      </template>

      <Column v-if="selectable" selection-mode="multiple" header-style="width: 3rem" :exportable="false" />

      <Column
        v-for="column in columns"
        :key="column.field"
        :field="column.field"
        :header="$slots[`header-${column.field}`] || column.sortable ? undefined : column.header"
        :sortable="column.sortable"
        :style="column.width ? { width: column.width } : undefined"
        :aria-label="column.header"
      >
        <!-- RGAA-027 : en-tête personnalisé — soit le slot fourni par le parent, soit un bouton de tri accessible
             (le th n'est plus focusable via pt.headerCell.tabindex ; le bouton déclenche le tri via requestSort). -->
        <template v-if="$slots[`header-${column.field}`] || column.sortable" #header>
          <slot v-if="$slots[`header-${column.field}`]" :name="`header-${column.field}`" />
          <button v-else type="button" class="ref-table-sort-button" :title="sortTitle(column)" @click="requestSort(column)">
            {{ column.header }}
          </button>
        </template>
        <template #body="slotProps">
          <Skeleton v-if="isSorting" width="80%" height="1rem" aria-label="Chargement en cours" />
          <slot v-else :name="`body-${column.field}`" v-bind="slotProps">
            {{ slotProps.data[column.field] }}
          </slot>
        </template>
      </Column>
    </DataTable>
  </section>
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

/* #2112 : en-tête épinglé — la zone de contenu PrimeVue devient la boîte de défilement
   verticale (bornée). PrimeVue v4 pose déjà `position: sticky` sur `.p-datatable-thead`
   mais sans `top` (inerte hors mode scrollable natif) : on fixe le point d'ancrage ici.
   Ne PAS épingler les `th` : le mode colonnes redimensionnables les force en
   `position: relative` (ancrage des poignées de resize) et gagnerait la cascade. */
:deep(.p-datatable-table-container) {
  max-height: 70vh;
  overflow: auto;
}

:deep(.p-datatable-thead) {
  top: 0;
  z-index: 2;
}

:deep(.p-datatable-thead > tr > th) {
  background-color: var(--background-alt-grey) !important;
  font-weight: 700;
  padding: 1rem;
  text-align: left;
  /* box-shadow plutôt que border-bottom : avec `border-collapse: collapse`, la bordure d'un
     `th` sticky reste collée au corps et disparaît au défilement. */
  border-bottom: none;
  box-shadow: inset 0 -2px 0 var(--border-default-grey);
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

/* RGAA-027 : le bouton de tri interne reprend l'apparence de l'en-tête sans chrome de bouton. */
.ref-table-sort-button {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.ref-table-sort-button:focus-visible {
  outline: 2px solid var(--text-action-high-blue-france, #000);
  outline-offset: 2px;
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

/* Cases à cocher de sélection : bleu DSFR de l'appli plutôt que le vert par défaut du thème
   PrimeVue Aura — fond bleu clair (action-low) + bordure/coche bleu France (action-high), plus
   doux qu'un aplat bleu plein. Le style de PrimeVue est injecté dynamiquement en JS (useStyle) :
   comme pour les icônes de tri ci-dessus, seul `!important` le bat de façon fiable. */
:deep(.p-checkbox-box) {
  border-color: var(--border-default-grey) !important;
}

:deep(.p-checkbox-box:hover) {
  border-color: var(--background-action-high-blue-france) !important;
}

:deep(.p-checkbox-box[data-p="checked"]),
:deep(.p-checkbox-box.p-highlight) {
  background: var(--background-action-low-blue-france) !important;
  border-color: var(--background-action-high-blue-france) !important;
}

:deep(.p-checkbox:not(.p-disabled) .p-checkbox-box[data-p="checked"]:hover),
:deep(.p-checkbox:not(.p-disabled) .p-checkbox-box.p-highlight:hover) {
  background: var(--background-action-low-blue-france-hover) !important;
  border-color: var(--background-action-high-blue-france-hover) !important;
}

:deep(.p-checkbox-box[data-p="checked"] .p-checkbox-icon),
:deep(.p-checkbox-box.p-highlight .p-checkbox-icon) {
  color: var(--background-action-high-blue-france) !important;
}

:deep(.p-checkbox.p-focus .p-checkbox-box) {
  outline-color: var(--background-action-high-blue-france) !important;
  box-shadow: 0 0 0 2px var(--background-action-high-blue-france) !important;
}
</style>
