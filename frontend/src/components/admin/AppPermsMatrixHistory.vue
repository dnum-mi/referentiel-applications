<script setup lang="ts">
import api from "@/api/index";
import type { AppPermsMatrixHistoryDto } from "@/client/types.gen";
import AppLoader from "@/components/AppLoader.vue";
import RefAppTable from "@/components/RefAppTable.vue";
import { formatDateFR } from "@/composables/use-date";
import type { TableColumn } from "@/types/table";
import { computed, onMounted, ref } from "vue";

const logs = ref<AppPermsMatrixHistoryDto[]>([]);
const isLoading = ref(false);
const errorMessage = ref("");

const headers: TableColumn[] = [
  { field: "Date", header: "Date", sortable: true },
  { field: "Detail", header: "Détail", sortable: false },
  { field: "Modifié par", header: "Modifié par", sortable: true },
];

const rows = computed(() =>
  logs.value.map((log) => ({
    id: log.id,
    // Objet Date brut (pas la chaîne formatée) pour que le tri chronologique de RefAppTable
    // fonctionne correctement ; l'affichage formaté se fait via le slot #body-Date.
    Date: new Date(log.createdAt),
    Detail: log.description,
    "Modifié par": log.changedByEmail ?? "Système / utilisateur supprimé",
  })),
);

async function fetchLogs() {
  isLoading.value = true;
  errorMessage.value = "";
  try {
    const response = await api.actorTypeControllerGetMatrixHistory();
    if (response.response.ok && response.data) {
      logs.value = response.data;
    } else {
      throw new Error("Failed to fetch perms matrix history");
    }
  } catch (error) {
    console.error("Error fetching perms matrix history:", error);
    errorMessage.value = "Erreur lors du chargement de l'historique des modifications.";
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchLogs();
});
</script>

<template>
  <div data-testid="app-perms-matrix-history">
    <div v-if="errorMessage" class="fr-alert fr-alert--error" data-testid="app-perms-matrix-history-error">
      <p>{{ errorMessage }}</p>
    </div>

    <div v-else-if="!isLoading && logs.length === 0" class="text-center" data-testid="app-perms-matrix-history-empty">
      <p>Aucune modification enregistrée.</p>
    </div>

    <div v-else>
      <AppLoader v-if="isLoading" data-testid="app-perms-matrix-history-loader" />
      <RefAppTable
        v-else
        :items="rows"
        :columns="headers"
        sort-field="Date"
        :sort-order="-1"
        empty-message="Aucune modification enregistrée."
        data-testid="app-perms-matrix-history-table"
      >
        <template #body-Date="{ data }">
          {{ formatDateFR(data.Date) }}
        </template>
        <template #body-Detail="{ data }">
          <!-- Contenu généré côté back : seuls des <b> et le libellé du type d'acteur (échappé
               côté back) sont insérés, pas de saisie libre. -->
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span class="history-detail" v-html="data.Detail" />
        </template>
      </RefAppTable>
    </div>
  </div>
</template>

<style scoped>
.history-detail {
  white-space: pre-wrap;
}
</style>
