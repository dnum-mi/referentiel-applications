<script setup lang="ts">
import api from "@/api/index";
import type { AuthLevel, UserConnexionLogDto } from "@/client/types.gen";
import AppLoader from "@/components/AppLoader.vue";
import RefAppTable from "@/components/RefAppTable.vue";
import { formatDateFR } from "@/composables/use-date";
import type { TableColumn } from "@/types/table";
import { computed, onMounted, ref } from "vue";

// #1985 — Historique des connexions d'un utilisateur (une ligne par jour et par niveau
// d'authentification), pour diagnostiquer ce que le fournisseur d'identité transmet réellement :
// c'est l'outil du support pendant la phase d'observation, avant toute activation.
const props = defineProps<{ userId: string }>();

const logs = ref<UserConnexionLogDto[]>([]);
const isLoading = ref(false);
const errorMessage = ref("");

const AUTH_LEVEL_WORDING: Record<AuthLevel, string> = {
  strong: "Forte",
  weak: "Faible",
  unknown: "Inconnue",
};
const AUTH_LEVEL_BADGE_CLASS: Record<AuthLevel, string> = {
  strong: "fr-badge--success",
  weak: "fr-badge--warning",
  unknown: "fr-badge--info",
};

const headers: TableColumn[] = [
  { field: "Date", header: "Date", sortable: true },
  { field: "Niveau", header: "Niveau d'authentification", sortable: false },
  { field: "Mode", header: "Mode transmis", sortable: false },
  { field: "Fournisseur", header: "Fournisseur d'identité", sortable: false },
];

const rows = computed(() =>
  logs.value.map((log) => ({
    id: log.id,
    // Objet Date brut pour le tri chronologique ; affichage formaté via le slot #body-Date.
    Date: new Date(log.authTime),
    Niveau: AUTH_LEVEL_WORDING[log.authLevel],
    level: log.authLevel,
    Mode: log.authMethod ?? "Non transmis",
    Fournisseur: log.authIdp ?? "Non transmis",
  })),
);

async function fetchLogs() {
  isLoading.value = true;
  errorMessage.value = "";
  try {
    const response = await api.userControllerFindConnexionLogs({ path: { id: props.userId } });
    if (response.response.ok && response.data) {
      logs.value = response.data;
    } else {
      throw new Error("Failed to fetch connexion logs");
    }
  } catch (error) {
    console.error("Error fetching connexion logs:", error);
    errorMessage.value = "Erreur lors du chargement de l'historique des connexions.";
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchLogs();
});
</script>

<template>
  <div class="fr-mt-4w" data-testid="user-connexion-log-history">
    <h3 class="fr-h6 fr-mb-2w">Historique des connexions</h3>
    <p class="fr-text--sm fr-mb-2w">
      Une ligne par jour et par niveau d'authentification. « Non transmis » signifie que le fournisseur d'identité n'a pas envoyé
      l'information (évaluation désactivée, jeton API ou claim absent).
    </p>

    <div v-if="errorMessage" class="fr-alert fr-alert--error" data-testid="connexion-log-history-error">
      <p>{{ errorMessage }}</p>
    </div>

    <div v-else-if="!isLoading && logs.length === 0" class="text-center" data-testid="connexion-log-history-empty">
      <p>Aucune connexion enregistrée.</p>
    </div>

    <div v-else>
      <AppLoader v-if="isLoading" data-testid="connexion-log-history-loader" />
      <RefAppTable
        v-else
        :items="rows"
        :columns="headers"
        sort-field="Date"
        :sort-order="-1"
        empty-message="Aucune connexion enregistrée."
        data-testid="connexion-log-history-table"
      >
        <template #body-Date="{ data }">
          {{ formatDateFR(data.Date) }}
        </template>
        <template #body-Niveau="{ data }">
          <span class="fr-badge fr-badge--sm" :class="AUTH_LEVEL_BADGE_CLASS[data.level as AuthLevel]">
            {{ data.Niveau }}
          </span>
        </template>
      </RefAppTable>
    </div>
  </div>
</template>
