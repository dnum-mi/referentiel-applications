<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { CorrelationSuggestionStatus } from "@/client/types.gen";
import {
  correlationSignalBadges,
  correlationStatusBadgeType,
  correlationStatusLabels,
  formatCorrelationScore,
} from "@/components/admin/admin-correlations.utils";
import RefAppTable from "@/components/RefAppTable.vue";
import { routeNames } from "@/router/route-names";
import { useCorrelationStore } from "@/stores/correlationStore";
import type { TableColumn, TableSortEvent } from "@/types/table";

/**
 * Écran de revue des suggestions de corrélation (#2281, #2286). Lecture seule :
 * les actions Accepter/Rejeter et le lancement manuel de la détection arrivent
 * dans un second temps. La visibilité est portée par la garde de la page admin
 * (ADMIN_PANEL_MANAGE), alignée sur la permission des endpoints.
 */
const correlationStore = useCorrelationStore();
const { suggestions, total, isLoading } = storeToRefs(correlationStore);

const statusOptions = [
  { value: "", text: "Tous les statuts" },
  ...Object.values(CorrelationSuggestionStatus).map((status) => ({
    value: status,
    text: correlationStatusLabels[status],
  })),
];

// Les suggestions en attente de revue d'abord : c'est l'objet de l'écran.
const statusFilter = ref<CorrelationSuggestionStatus | "">(CorrelationSuggestionStatus.PENDING);

const columns: TableColumn[] = [
  { field: "pair", header: "Paire d'applications", sortable: false },
  { field: "score", header: "Score", sortable: true },
  { field: "signals", header: "Signaux", sortable: false },
  { field: "status", header: "Statut", sortable: false },
  { field: "createdAt", header: "Détectée le", sortable: true },
];

const sortColumn = ref<string>("score");
const isSortDescending = ref(true);
const itemsPerPage = ref(15);
const currentPage = ref(0);
const firstIndex = computed(() => currentPage.value * itemsPerPage.value);

// RGAA (7.5) : message de statut sur le nombre de résultats, restitué aux TA.
const statusMessage = computed(() => {
  if (isLoading.value) return "Chargement des suggestions de corrélation…";
  if (total.value === 0) return "Aucune suggestion de corrélation : Résultat 0 à 0";
  const from = firstIndex.value + 1;
  const to = Math.min(firstIndex.value + suggestions.value.length, total.value);
  return `Résultat ${from} à ${to} sur ${total.value}`;
});

async function fetchSuggestions() {
  await correlationStore.fetchSuggestions({
    status: statusFilter.value || undefined,
    page: currentPage.value,
    pageSize: itemsPerPage.value,
    sortBy: sortColumn.value,
    order: isSortDescending.value ? "desc" : "asc",
  });
}

watch(statusFilter, () => {
  currentPage.value = 0;
  fetchSuggestions();
});

function onSort(event: TableSortEvent) {
  sortColumn.value = event.sortField as string;
  isSortDescending.value = event.sortOrder === -1;
  currentPage.value = 0;
  fetchSuggestions();
}

function onPage(event: { page: number; rows: number }) {
  currentPage.value = event.page;
  itemsPerPage.value = event.rows;
  fetchSuggestions();
}

const tableRows = computed(() =>
  suggestions.value.map((suggestion) => ({
    id: suggestion.id,
    pair: suggestion,
    score: formatCorrelationScore(suggestion.score),
    signals: suggestion,
    status: suggestion.status,
    createdAt: formatDate(suggestion.createdAt),
  })),
);

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("fr-FR");
}

onMounted(fetchSuggestions);
</script>

<template>
  <div class="header-row">
    <h1 class="fr-h1" data-testid="admin-correlations-title">Revue des corrélations</h1>
  </div>

  <p class="fr-text--sm fr-mb-2w">
    Suggestions de corrélation détectées automatiquement entre applications (noms similaires, données partagées, acteurs communs). Aucune
    relation n'est créée sans revue humaine.
  </p>

  <div class="fr-mb-4w filter-row">
    <DsfrSelect v-model="statusFilter" :options="statusOptions" label="Filtrer par statut" data-testid="admin-correlations-status-filter" />
  </div>

  <div aria-live="polite" aria-atomic="true" class="fr-sr-only" data-testid="admin-correlations-status">
    <p>{{ statusMessage }}</p>
  </div>

  <div v-if="isLoading" class="fr-alert fr-alert--info" data-testid="admin-correlations-loading">
    <p>Chargement des suggestions de corrélation...</p>
  </div>

  <div v-else>
    <RefAppTable
      :items="tableRows"
      :columns="columns"
      data-key="id"
      :paginator="true"
      :lazy="true"
      :rows="itemsPerPage"
      :first="firstIndex"
      :total-records="total"
      :sort-field="sortColumn"
      :sort-order="isSortDescending ? -1 : 1"
      data-testid="admin-correlations-table"
      empty-message="Aucune suggestion de corrélation pour ce statut."
      @sort="onSort"
      @page="onPage"
    >
      <template #body-pair="{ data: row }">
        <div class="pair-cell">
          <RouterLink
            :to="{ name: routeNames.PROFILEAPP, params: { id: row.pair.sourceApplication.id } }"
            :data-testid="`correlation-source-link-${row.id}`"
          >
            {{ row.pair.sourceApplication.label }}
          </RouterLink>
          <span aria-hidden="true">⇄</span>
          <span class="fr-sr-only">corrélée à</span>
          <RouterLink
            :to="{ name: routeNames.PROFILEAPP, params: { id: row.pair.targetApplication.id } }"
            :data-testid="`correlation-target-link-${row.id}`"
          >
            {{ row.pair.targetApplication.label }}
          </RouterLink>
        </div>
      </template>

      <template #body-signals="{ data: row }">
        <ul class="fr-badges-group" :data-testid="`correlation-signals-${row.id}`">
          <li v-for="badge in correlationSignalBadges(row.signals)" :key="badge.key">
            <DsfrBadge :label="badge.label" type="info" small />
          </li>
        </ul>
      </template>

      <template #body-status="{ data: row }">
        <DsfrBadge
          :label="correlationStatusLabels[row.status as CorrelationSuggestionStatus]"
          :type="correlationStatusBadgeType[row.status as CorrelationSuggestionStatus]"
          small
        />
      </template>
    </RefAppTable>
  </div>
</template>

<style scoped>
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-row {
  max-width: 20rem;
}

.pair-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
</style>
