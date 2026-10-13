<script setup lang="ts">
import { isApiSuccess } from "@/api/api-result";
import api from "@/api/index";
import type { ActionLogDto, PaginatedActionLogDto } from "@/client/types.gen";
import RefAppTable from "@/components/RefAppTable.vue";
import { formatDateFR } from "@/composables/use-date";
import type { TableColumn } from "@/types/table";
import { DsfrSearchBar } from "@gouvminint/vue-dsfr";
import { watchDebounced } from "@vueuse/core";
import type { DataTablePageEvent } from "primevue/datatable";

const data = ref<PaginatedActionLogDto>({ results: [], total: 0 });
const isLoading = ref(false);
const hasLoadedOnce = ref(false);
const errorMessage = ref("");
const statusMessage = computed(() => {
  if (isLoading.value) return "Chargement du journal des actions…";
  if (!hasLoadedOnce.value || errorMessage.value) return "";
  if (data.value.total === 0) return "Aucune action journalisée.";
  return `${data.value.total} action${data.value.total > 1 ? "s" : ""} journalisée${data.value.total > 1 ? "s" : ""}.`;
});
const search = ref("");
const createdAtGte = ref("");
const createdAtLte = ref("");

const columns: TableColumn[] = [
  { field: "date", header: "Date", sortable: false },
  { field: "method", header: "Méthode", sortable: false },
  { field: "path", header: "Chemin", sortable: false },
  { field: "statusCode", header: "Statut", sortable: false },
  { field: "user", header: "Utilisateur", sortable: false },
];

const itemsPerPage = ref(20);
const currentPage = ref(0);
const firstIndex = computed(() => currentPage.value * itemsPerPage.value);

function convertLocalToUTC(localDateTimeString: string): string {
  if (!localDateTimeString) return "";
  return new Date(localDateTimeString).toISOString();
}

async function fetchLogs() {
  isLoading.value = true;
  errorMessage.value = "";
  try {
    const response = await api.actionLogControllerFindAll({
      query: {
        page: currentPage.value,
        pageSize: itemsPerPage.value,
        search: search.value || undefined,
        createdAtGte: createdAtGte.value ? convertLocalToUTC(createdAtGte.value) : undefined,
        createdAtLte: createdAtLte.value ? convertLocalToUTC(createdAtLte.value) : undefined,
      },
    });
    if (isApiSuccess(response) && response.data) {
      data.value = response.data;
      hasLoadedOnce.value = true;
    } else {
      throw new Error("Failed to fetch action logs");
    }
  } catch (error) {
    console.error("Error fetching action logs:", error);
    errorMessage.value = "Erreur lors du chargement du journal des actions.";
  } finally {
    isLoading.value = false;
  }
}

// Signalement créé sous impersonation : afficher aussi l'admin réel (#2061), comme
// pour les Modifications et les Signalements.
function formatUser(log: ActionLogDto): string {
  return log.impersonator?.email ? `${log.user.email} (via ${log.impersonator.email})` : log.user.email;
}

const tableRows = computed(() =>
  data.value.results.map((log: ActionLogDto) => ({
    id: log.id,
    date: formatDateFR(new Date(log.createdAt)),
    method: log.method,
    path: log.path,
    statusCode: log.statusCode,
    user: formatUser(log),
  })),
);

function onPage(event: DataTablePageEvent) {
  currentPage.value = event.page;
  itemsPerPage.value = event.rows;
  fetchLogs();
}

watchDebounced(
  search,
  () => {
    currentPage.value = 0;
    fetchLogs();
  },
  { debounce: 300 },
);

watch([createdAtGte, createdAtLte], () => {
  currentPage.value = 0;
  fetchLogs();
});

// L'onglet est gardé en vie par le <KeepAlive> d'AdminPage : onMounted ne se déclenche
// qu'une fois. onActivated couvre le montage initial ET chaque retour sur l'onglet.
onActivated(fetchLogs);
</script>

<template>
  <div>
    <h2 class="fr-h1" data-testid="admin-action-logs-title">Journal des actions</h2>
    <p>Journal centralisé de toutes les requêtes mutantes de l'application (créations, modifications, suppressions).</p>

    <div class="fr-grid-row fr-grid-row--gutters fr-mb-2w">
      <div class="fr-col-12 fr-col-md-6">
        <DsfrSearchBar
          v-model.trim="search"
          label="Rechercher"
          placeholder="Recherche par chemin ou par email"
          button-text="Rechercher"
          data-testid="admin-action-logs-search"
        />
      </div>
      <div class="fr-col-6 fr-col-md-3">
        <DsfrInputGroup
          v-model="createdAtGte"
          label="Date de début"
          label-visible
          type="datetime-local"
          data-testid="admin-action-logs-date-from"
        />
      </div>
      <div class="fr-col-6 fr-col-md-3">
        <DsfrInputGroup
          v-model="createdAtLte"
          label="Date de fin"
          label-visible
          type="datetime-local"
          data-testid="admin-action-logs-date-to"
        />
      </div>
    </div>

    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      :class="errorMessage ? 'fr-alert fr-alert--error fr-mb-2w' : undefined"
      data-testid="admin-action-logs-error"
    >
      <p v-if="errorMessage">{{ errorMessage }}</p>
    </div>

    <output class="fr-sr-only" aria-live="polite" aria-atomic="true" data-testid="admin-action-logs-status">{{ statusMessage }}</output>

    <div v-if="isLoading && !hasLoadedOnce" class="fr-alert fr-alert--info" data-testid="admin-action-logs-loading">
      <p>Chargement du journal...</p>
    </div>

    <div v-else-if="hasLoadedOnce">
      <div v-if="data.results.length === 0" class="fr-card fr-p-3w">
        <p class="fr-text--center fr-mb-0">Aucune action journalisée.</p>
      </div>

      <RefAppTable
        v-else
        :items="tableRows"
        :columns="columns"
        data-key="id"
        :loading="isLoading"
        :lazy="true"
        :paginator="true"
        :rows="itemsPerPage"
        :first="firstIndex"
        :total-records="data.total"
        data-testid="admin-action-logs-table"
        @page="onPage"
      />
    </div>
  </div>
</template>
