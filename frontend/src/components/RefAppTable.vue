<script setup lang="ts" generic="T">
import { computed, ref, nextTick, useId, watch } from "vue";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Skeleton from "primevue/skeleton";
import PaginationFooter from "./PaginationFooter.vue";
import type { TableColumn, TableSortEvent } from "@/types/table";
import type { DataTableSortEvent, DataTablePageEvent, DataTableColumnResizeEndEvent } from "primevue/datatable";
import { DEFAULT_COLUMN_WIDTH, MIN_COLUMN_WIDTH, MAX_COLUMN_WIDTH, normalizeColumnWidth } from "@/utils/column-width";

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
  /** Intitulé du tableau, associé à la table HTML native. */
  caption?: string;
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
const tableTitleId = `table-title-${useId()}`;
const tableCaption = computed(() => props.caption ?? `Tableau : ${props.columns.map((column) => column.header).join(", ")}`);
const tableSection = ref<HTMLElement>();
const resizedWidths = ref<Record<string, number>>({});
const widthInputs = ref<Record<string, string>>({});
const widthStatus = ref("");
const hasControlledWidths = computed(
  () => Object.keys(resizedWidths.value).length > 0 || props.columns.some((column) => normalizeColumnWidth(column.width) !== undefined),
);
const columnWidth = (column: Pick<TableColumn, "field" | "width">) =>
  resizedWidths.value[column.field] ?? normalizeColumnWidth(column.width) ?? DEFAULT_COLUMN_WIDTH;
const tableStyle = computed(() => {
  if (!hasControlledWidths.value) return { minWidth: "50rem" };
  const width = props.columns.reduce((sum, column) => sum + columnWidth(column), props.selectable ? 48 : 0);
  return { width: `${width}px`, minWidth: `${width}px`, tableLayout: "fixed" };
});

function columnStyle(column: TableColumn) {
  if (!hasControlledWidths.value) return column.width ? { width: column.width } : undefined;
  // PrimeVue écrit des règles !important au redimensionnement souris. Le modèle partagé
  // pilote aussi ces largeurs pour que le réglage clavier reste effectif après un glissement.
  const width = `${columnWidth(column)}px !important`;
  return { width, maxWidth: width, minWidth: `${MIN_COLUMN_WIDTH}px`, overflowWrap: "anywhere" };
}

function renderedWidths() {
  return Object.fromEntries(
    props.columns.map((column) => {
      const header = Array.from(tableSection.value?.querySelectorAll<HTMLElement>("thead th[data-column-field]") ?? []).find(
        (element) => element.dataset.columnField === column.field,
      );
      return [column.field, normalizeColumnWidth(header?.getBoundingClientRect().width) ?? columnWidth(column)];
    }),
  );
}

function prepareWidthInputs() {
  widthInputs.value = Object.fromEntries(Object.entries(renderedWidths()).map(([field, width]) => [field, String(width)]));
}

function updateWidths(widths: Record<string, number>, previousWidths: Record<string, number>) {
  resizedWidths.value = { ...resizedWidths.value, ...widths };
  widthInputs.value = Object.fromEntries(Object.entries(widths).map(([field, width]) => [field, String(width)]));
  for (const [field, width] of Object.entries(widths)) {
    if (width !== previousWidths[field]) emit("columnResize", { field, width: `${width}px` });
  }
}

function applyColumnWidth(column: TableColumn) {
  const width = Number(widthInputs.value[column.field]);
  if (!Number.isInteger(width) || width < MIN_COLUMN_WIDTH || width > MAX_COLUMN_WIDTH) return;
  const previousWidths = renderedWidths();
  updateWidths({ ...previousWidths, [column.field]: width }, previousWidths);
  widthStatus.value = `La largeur de la colonne ${column.header} est maintenant de ${width} pixels.`;
}

watch(
  () => props.columns.map(({ field, width }) => ({ field, width })),
  (columns, previousColumns) => {
    for (const column of columns) {
      if (column.width !== previousColumns.find((previous) => previous.field === column.field)?.width) {
        delete resizedWidths.value[column.field];
        widthInputs.value[column.field] = String(columnWidth(column));
      }
    }
    for (const field of Object.keys(resizedWidths.value)) {
      if (!columns.some((column) => column.field === field)) delete resizedWidths.value[field];
    }
  },
);

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
  // #2522 : l'état de tri est tenu ici aussi. Sans cela, un tableau NON paresseux (tri client,
  // sans gestionnaire `@sort` chez le parent) ne triait jamais depuis le bouton d'en-tête —
  // PrimeVue ignore les clics dont la cible est cliquable, et seul le parent pouvait mettre
  // à jour `sortField`/`sortOrder`. En mode paresseux, le parent renvoie les mêmes valeurs.
  internalSortField.value = sortField;
  internalSortOrder.value = sortOrder;

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
  const field = event.element?.dataset.columnField;
  const index = props.columns.findIndex((column) => column.field === field);
  if (!field || index < 0) return;
  const previousWidths = renderedWidths();
  if (!hasControlledWidths.value) {
    // Dans ce cas PrimeVue a déjà changé les cellules : mémoriser le rendu obtenu.
    resizedWidths.value = previousWidths;
    widthInputs.value = Object.fromEntries(Object.entries(previousWidths).map(([key, width]) => [key, String(width)]));
    emit("columnResize", { field, width: `${previousWidths[field]}px` });
    const nextField = props.columns[index + 1]?.field;
    if (nextField) emit("columnResize", { field: nextField, width: `${previousWidths[nextField]}px` });
    return;
  }
  const nextField = props.columns[index + 1]?.field;
  const minimumDelta = Math.max(
    MIN_COLUMN_WIDTH - previousWidths[field],
    nextField ? previousWidths[nextField] - MAX_COLUMN_WIDTH : Number.NEGATIVE_INFINITY,
  );
  const maximumDelta = Math.min(
    MAX_COLUMN_WIDTH - previousWidths[field],
    nextField ? previousWidths[nextField] - MIN_COLUMN_WIDTH : Number.POSITIVE_INFINITY,
  );
  const delta = Math.max(minimumDelta, Math.min(maximumDelta, event.delta));
  const widths = { ...previousWidths, [field]: previousWidths[field] + delta };
  if (nextField) widths[nextField] = previousWidths[nextField] - delta;
  updateWidths(widths, previousWidths);
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
  <section ref="tableSection" class="fr-table" :aria-labelledby="tableTitleId">
    <p :id="tableTitleId" class="fr-sr-only">{{ tableCaption }}</p>
    <details class="ref-table-width-settings fr-mb-2w" @toggle="prepareWidthInputs">
      <summary>Régler la largeur des colonnes</summary>
      <p :id="`${tableTitleId}-width-help`" class="fr-hint-text">
        Choisissez une largeur entre {{ MIN_COLUMN_WIDTH }} et {{ MAX_COLUMN_WIDTH }} pixels, puis activez Appliquer.
      </p>
      <form v-for="column in columns" :key="column.field" class="ref-table-width-form" @submit.prevent="applyColumnWidth(column)">
        <label class="fr-label" :for="`${tableTitleId}-width-${column.field}`">{{ column.header }} — largeur en pixels</label>
        <input
          :id="`${tableTitleId}-width-${column.field}`"
          v-model="widthInputs[column.field]"
          class="fr-input"
          type="number"
          required
          :min="MIN_COLUMN_WIDTH"
          :max="MAX_COLUMN_WIDTH"
          step="1"
          :aria-describedby="`${tableTitleId}-width-help`"
        />
        <button
          type="submit"
          class="fr-btn fr-btn--secondary fr-btn--sm"
          :aria-label="`Appliquer la largeur de la colonne ${column.header}`"
        >
          Appliquer
        </button>
      </form>
    </details>
    <output class="fr-sr-only">{{ widthStatus }}</output>
    <DataTable
      v-model:selection="selection"
      :value="items"
      :data-key="dataKey"
      :lazy="lazy"
      :total-records="totalRecords"
      :rows="rows"
      :first="first"
      :paginator="paginator"
      :sort-field="internalSortField"
      :sort-order="internalSortOrder"
      :loading="loading && !isSorting"
      :data-testid="dataTestId"
      :table-props="{ 'aria-labelledby': tableTitleId }"
      :pt="{
        column: { headerCell: { tabindex: null, scope: 'col' } },
        pcPaginator: { paginatorContainer: { 'aria-label': 'Pagination' } },
      }"
      striped-rows
      resizable-columns
      column-resize-mode="fit"
      responsive-layout="scroll"
      :aria-busy="loading || isSorting"
      @sort="onSort"
      @page="onPage"
      @column-resize-end="onColumnResize"
      :table-style="tableStyle"
    >
      <template #paginatorcontainer="pagination">
        <PaginationFooter
          embedded
          :total-filtered="pagination.totalRecords ?? 0"
          :page="pagination.page"
          :limit="pagination.rows"
          @update:page="pagination.changePageCallback"
          @update:limit="pagination.rowChangeCallback"
        />
      </template>
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
        :style="columnStyle(column)"
        :pt="{ headerCell: { 'data-column-field': column.field } }"
        :aria-label="column.header"
      >
        <!-- Le bouton de tri reste distinct des commandes supplémentaires de l'en-tête.
             PrimeVue ne doit pas annuler l'activation native du bouton avec Entrée ou Espace. -->
        <template v-if="$slots[`header-${column.field}`] || column.sortable" #header>
          <button
            v-if="column.sortable"
            type="button"
            class="ref-table-sort-button"
            :title="sortTitle(column)"
            @click="requestSort(column)"
            @keydown.enter.stop
            @keydown.space.stop
          >
            {{ column.header }}
          </button>
          <slot v-if="$slots[`header-${column.field}`]" :name="`header-${column.field}`" />
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
.ref-table-width-settings summary {
  cursor: pointer;
}

.ref-table-width-settings summary:focus-visible {
  outline: 2px solid var(--text-action-high-blue-france, #000);
  outline-offset: 2px;
}

.ref-table-width-form {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.ref-table-width-form .fr-label {
  flex: 1 1 14rem;
}

.ref-table-width-form .fr-input {
  width: 7rem;
}

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
  border-color: var(--text-mention-grey) !important;
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

:deep(.p-checkbox.p-focus .p-checkbox-box),
:deep(.p-checkbox:has(input:focus-visible) .p-checkbox-box) {
  outline-color: var(--background-action-high-blue-france) !important;
  box-shadow: 0 0 0 2px var(--background-action-high-blue-france) !important;
}
</style>
