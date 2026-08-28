<script setup lang="ts">
import api from "@/api/index";
import type { UserPermissionLogDto } from "@/client/types.gen";
import AppLoader from "@/components/AppLoader.vue";
import RefAppTable from "@/components/RefAppTable.vue";
import { formatDateFR } from "@/composables/use-date";
import type { TableColumn } from "@/types/table";
import { PERMISSIONS_LABELS, RolesWording } from "@/utils/roles-utils";
import { computed, onMounted, ref } from "vue";

const props = defineProps<{ userId: string }>();

const logs = ref<UserPermissionLogDto[]>([]);
const isLoading = ref(false);
const errorMessage = ref("");

const headers: TableColumn[] = [
  { field: "Date", header: "Date", sortable: true },
  { field: "Rôle", header: "Rôle", sortable: false },
  { field: "Permissions supplémentaires", header: "Permissions supplémentaires", sortable: false },
  { field: "Modifié par", header: "Modifié par", sortable: true },
];

const rows = computed(() =>
  logs.value.map((log) => ({
    id: log.id,
    // Objet Date brut (pas la chaîne formatée) pour que le tri chronologique de RefAppTable
    // fonctionne correctement ; l'affichage formaté se fait via le slot #body-Date.
    Date: new Date(log.createdAt),
    Rôle: log.role ? RolesWording[log.role] : "Non renseigné",
    "Permissions supplémentaires": log.additionalPermissions.length
      ? log.additionalPermissions.map((perm) => PERMISSIONS_LABELS[perm]).join(", ")
      : "Aucune",
    // Modification faite sous impersonation : afficher aussi l'admin réel (#2061).
    "Modifié par": log.impersonatorEmail
      ? `${log.changedByEmail ?? "Système / utilisateur supprimé"} (via ${log.impersonatorEmail})`
      : (log.changedByEmail ?? "Système / utilisateur supprimé"),
  })),
);

async function fetchLogs() {
  isLoading.value = true;
  errorMessage.value = "";
  try {
    const response = await api.userControllerFindPermissionLogs({ path: { id: props.userId } });
    if (response.response.ok && response.data) {
      logs.value = response.data;
    } else {
      throw new Error("Failed to fetch permission logs");
    }
  } catch (error) {
    console.error("Error fetching permission logs:", error);
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
  <div class="fr-mt-4w" data-testid="user-permission-log-history">
    <h3 class="fr-h6 fr-mb-2w">Historique des modifications de droits</h3>

    <div v-if="errorMessage" class="fr-alert fr-alert--error" data-testid="permission-log-history-error">
      <p>{{ errorMessage }}</p>
    </div>

    <div v-else-if="!isLoading && logs.length === 0" class="text-center" data-testid="permission-log-history-empty">
      <p>Aucune modification enregistrée.</p>
    </div>

    <div v-else>
      <AppLoader v-if="isLoading" data-testid="permission-log-history-loader" />
      <RefAppTable
        v-else
        :items="rows"
        :columns="headers"
        sort-field="Date"
        :sort-order="-1"
        empty-message="Aucune modification enregistrée."
        data-testid="permission-log-history-table"
      >
        <template #body-Date="{ data }">
          {{ formatDateFR(data.Date) }}
        </template>
      </RefAppTable>
    </div>
  </div>
</template>
