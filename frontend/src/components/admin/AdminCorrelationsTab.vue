<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { CorrelationSuggestionStatus, type CorrelationSuggestionDto } from "@/client/types.gen";
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
 * Écran de revue des suggestions de corrélation (#2281, #2286). Accepter crée
 * la relation is_correlated_with sur les deux fiches ; rejeter écarte la paire
 * définitivement. La visibilité est portée par la garde de la page admin
 * (ADMIN_PANEL_MANAGE), alignée sur la permission des endpoints.
 */
const correlationStore = useCorrelationStore();
const { suggestions, total, isLoading, isDetectionRunning } = storeToRefs(correlationStore);

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
  { field: "actions", header: "Actions", sortable: false },
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
    actions: suggestion,
  })),
);

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("fr-FR");
}

/** Action en attente de confirmation (accepter ou rejeter une suggestion). */
const pendingAction = ref<{ type: "accept" | "reject"; suggestion: CorrelationSuggestionDto } | null>(null);

const confirmationTitle = computed(() =>
  pendingAction.value?.type === "accept" ? "Accepter la suggestion de corrélation" : "Rejeter la suggestion de corrélation",
);

const confirmationMessage = computed(() => {
  if (!pendingAction.value) return "";
  const { type, suggestion } = pendingAction.value;
  const pair = `« ${suggestion.sourceApplication.label} » et « ${suggestion.targetApplication.label} »`;
  return type === "accept"
    ? `Une relation « Est corrélée à » sera créée entre ${pair} et visible sur les deux fiches.`
    : `La suggestion entre ${pair} sera écartée et ne sera plus jamais proposée.`;
});

function askToAccept(suggestion: CorrelationSuggestionDto) {
  pendingAction.value = { type: "accept", suggestion };
}

function askToReject(suggestion: CorrelationSuggestionDto) {
  pendingAction.value = { type: "reject", suggestion };
}

function cancelAction() {
  pendingAction.value = null;
}

// Suggestion dont l'action est en cours : ses boutons sont neutralisés le
// temps de l'aller-retour, pour ne pas déclencher deux revues d'un double clic.
const actionInProgressId = ref<string | null>(null);

async function confirmAction() {
  if (!pendingAction.value) return;
  const { type, suggestion } = pendingAction.value;
  pendingAction.value = null;
  actionInProgressId.value = suggestion.id;
  try {
    const result =
      type === "accept" ? await correlationStore.acceptSuggestion(suggestion.id) : await correlationStore.rejectSuggestion(suggestion.id);
    // Un échec de conflit (suggestion revue ailleurs) a déjà été expliqué par
    // un toast : la liste est rafraîchie dans tous les cas pour retomber sur
    // l'état réel.
    await fetchSuggestions();
    return result;
  } finally {
    actionInProgressId.value = null;
  }
}

async function launchDetection() {
  const result = await correlationStore.runDetection();
  if (result) await fetchSuggestions();
}

onMounted(fetchSuggestions);
</script>

<template>
  <div class="header-row">
    <h1 class="fr-h1" data-testid="admin-correlations-title">Revue des corrélations</h1>

    <DsfrButton
      type="button"
      secondary
      icon="ri-radar-line"
      :disabled="isDetectionRunning"
      data-testid="run-detection-button"
      @click="launchDetection"
    >
      {{ isDetectionRunning ? "Détection en cours…" : "Lancer la détection" }}
    </DsfrButton>
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

      <template #body-actions="{ data: row }">
        <div v-if="row.actions.status === 'PENDING'" class="actions-cell">
          <DsfrButton
            type="button"
            size="sm"
            icon="ri-check-line"
            :disabled="actionInProgressId === row.id"
            :data-testid="`accept-suggestion-${row.id}`"
            @click="askToAccept(row.actions)"
          >
            Accepter
          </DsfrButton>
          <DsfrButton
            type="button"
            size="sm"
            secondary
            icon="ri-close-line"
            :disabled="actionInProgressId === row.id"
            :data-testid="`reject-suggestion-${row.id}`"
            @click="askToReject(row.actions)"
          >
            Rejeter
          </DsfrButton>
        </div>
        <span v-else aria-hidden="true">—</span>
      </template>
    </RefAppTable>
  </div>

  <DsfrModal
    :opened="pendingAction !== null"
    :title="confirmationTitle"
    size="sm"
    data-testid="correlation-confirm-modal"
    @close="cancelAction"
  >
    <p>{{ confirmationMessage }}</p>
    <div class="actions-cell">
      <DsfrButton type="button" tertiary data-testid="correlation-cancel-btn" @click="cancelAction"> Annuler </DsfrButton>
      <DsfrButton type="button" primary data-testid="correlation-confirm-btn" @click="confirmAction"> Confirmer </DsfrButton>
    </div>
  </DsfrModal>
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

.actions-cell {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
</style>
