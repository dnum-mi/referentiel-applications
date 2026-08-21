<script setup lang="ts">
import api from "@/api/index";
import type { EmailLogDto, PaginatedEmailLogDto } from "@/client/types.gen";
import RefAppTable from "@/components/RefAppTable.vue";
import type { TableColumn } from "@/types/table";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { DataTablePageEvent } from "primevue/datatable";
import EmailLogContentModal from "./EmailLogContentModal.vue";

const data = ref<PaginatedEmailLogDto>({ results: [], total: 0 });
const isLoading = ref(false);
const hasLoadedOnce = ref(false);
const errorMessage = ref("");

const columns: TableColumn[] = [
  { field: "sentAt", header: "Date d'envoi", sortable: false },
  { field: "to", header: "Destinataire(s)", sortable: false },
  { field: "subject", header: "Objet", sortable: false },
  { field: "actions", header: "Actions", sortable: false },
];

const itemsPerPage = ref(15);
const currentPage = ref(0);
const firstIndex = computed(() => currentPage.value * itemsPerPage.value);

async function fetchLogs() {
  isLoading.value = true;
  errorMessage.value = "";
  try {
    const response = await api.emailControllerFindLogs({
      query: { page: currentPage.value, pageSize: itemsPerPage.value },
    });
    if (response.response.ok && response.data) {
      data.value = response.data;
      hasLoadedOnce.value = true;
    } else {
      throw new Error("Failed to fetch email logs");
    }
  } catch (error) {
    console.error("Error fetching email logs:", error);
    errorMessage.value = "Erreur lors du chargement de l'historique des e-mails.";
  } finally {
    isLoading.value = false;
  }
}

const tableRows = computed(() =>
  data.value.results.map((log: EmailLogDto) => ({
    id: log.id,
    sentAt: format(new Date(log.sentAt), "dd/MM/yyyy HH:mm", { locale: fr }),
    to: log.to,
    subject: log.subject,
    actions: log,
  })),
);

function onPage(event: DataTablePageEvent) {
  currentPage.value = event.page;
  itemsPerPage.value = event.rows;
  fetchLogs();
}

// L'onglet est gardé en vie par le <KeepAlive> d'AdminPage : onMounted ne se déclenche
// qu'une fois. onActivated couvre le montage initial ET chaque retour sur l'onglet, ce qui
// évite d'afficher des données obsolètes (ex: un e-mail envoyé pendant qu'on était sur un autre
// onglet).
onActivated(fetchLogs);
</script>

<template>
  <div>
    <h1 class="fr-h1" data-testid="admin-email-logs-title">Historique des e-mails envoyés</h1>

    <div v-if="errorMessage" class="fr-alert fr-alert--error fr-mb-2w" data-testid="admin-email-logs-error">
      <p>{{ errorMessage }}</p>
    </div>

    <div v-if="isLoading && !hasLoadedOnce" class="fr-alert fr-alert--info" data-testid="admin-email-logs-loading">
      <p>Chargement de l'historique...</p>
    </div>

    <div v-else-if="hasLoadedOnce">
      <div v-if="data.results.length === 0" class="fr-card fr-p-3w">
        <p class="fr-text--center fr-mb-0">Aucun e-mail envoyé pour le moment.</p>
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
        data-testid="admin-email-logs-table"
        @page="onPage"
      >
        <template #body-actions="{ data: row }">
          <EmailLogContentModal :log="row.actions" />
        </template>
      </RefAppTable>
    </div>
  </div>
</template>
