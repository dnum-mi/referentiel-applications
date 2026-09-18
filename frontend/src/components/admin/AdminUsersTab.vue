<script setup lang="ts">
import api from "@/api/index";
import type { UserWithPermissions } from "@/client/types.gen";
import RefAppTable from "@/components/RefAppTable.vue";
import { useServerPaginatedTable } from "@/composables/use-server-paginated-table";
import { formatDateFR } from "@/composables/use-date";
import type { TableColumn } from "@/types/table";
import { RolesWording, RolesWordingBadgeClass } from "@/utils/roles-utils";
import type { DsfrDataTableHeaderCellObject } from "@gouvminint/vue-dsfr";
import { watchDebounced } from "@vueuse/core";
import { computed, onMounted, ref } from "vue";
import UserActions from "./UserActions.vue";
import UserConnexionLogHistory from "./UserConnexionLogHistory.vue";

const errorMessages = {
  ERR_LOAD_USERS: "Erreur lors du chargement des utilisateurs",
} as const;

const connexionHistoryUser = ref<Pick<UserWithPermissions, "id" | "email"> | null>(null);

function showConnexionHistory(user: UserWithPermissions) {
  // Garder l'identité consultée même si la liste est actualisée pendant la consultation.
  connexionHistoryUser.value = { id: user.id, email: user.email };
}

const headers: (DsfrDataTableHeaderCellObject & { isSortable?: boolean })[] = [
  {
    key: "email",
    label: "Email",
    isSortable: true,
  },
  {
    key: "organisation",
    label: "Organisation",
    isSortable: true,
  },
  {
    key: "role",
    label: "Role",
    isSortable: true,
  },
  {
    key: "isBlocked",
    label: "Statut",
    isSortable: true,
  },
  {
    key: "consultation",
    label: "Consultation",
    isSortable: false,
  },
  {
    key: "lastPermissionChangeAt",
    label: "Dernière modification",
    isSortable: true,
  },
  {
    key: "actions",
    label: "Actions",
  },
] as const;

const tableColumns: TableColumn[] = headers.map((h) => ({
  field: h.key,
  header: h.label,
  sortable: h.isSortable || false,
}));

// Les actualisations gardent la table et les modals UserActions montés (#1830).
const searchQuery = ref("");
const {
  data,
  isLoading,
  hasLoadedOnce,
  hasError,
  itemsPerPage,
  firstIndex,
  sortColumn,
  isSortDescending,
  onSort,
  onPage,
  resetAndFetch,
  refresh: fetchUsers,
  statusMessage: createStatusMessage,
} = useServerPaginatedTable<UserWithPermissions>({
  initialSortColumn: "email",
  fetchPage: async (pagination) => {
    const response = await api.userControllerFindAll({
      query: { ...pagination, search: searchQuery.value || undefined },
    });
    if (!response.response.ok || !response.data) {
      throw response.error ?? new Error(errorMessages.ERR_LOAD_USERS);
    }
    return response.data;
  },
});
const statusMessage = createStatusMessage("utilisateurs");

watchDebounced(searchQuery, resetAndFetch, { debounce: 300 });

const tableRows = computed(() =>
  data.value.results.map((user) => ({
    id: user.id,
    email: user.email,
    organisation: user.organization?.path || "-",
    additionalPermissions: user.additionalPermissions,
    role: {
      label: RolesWording[user.role],
      badgeClass: RolesWordingBadgeClass[user.role],
    },
    isBlocked: user.isBlocked,
    lastPermissionChangeAt: {
      date: user.lastPermissionChangeAt ?? null,
      email: user.lastPermissionChangedByEmail ?? null,
      // Modification faite sous impersonation : afficher aussi l'admin réel (#2061).
      impersonatorEmail: user.lastPermissionChangedByImpersonatorEmail ?? null,
    },
    actions: user,
  })),
);

onMounted(fetchUsers);
</script>

<template>
  <div>
    <h1 class="fr-h1" data-testid="admin-users-title">Gestion des utilisateurs</h1>

    <div class="fr-mb-4w">
      <DsfrSearchBar
        v-model.trim="searchQuery"
        label="Rechercher un utilisateur"
        placeholder="Rechercher par email ou organisation..."
        button-text="Rechercher"
        class="fr-col-12"
        data-testid="admin-user-search"
      />
    </div>

    <div aria-live="polite" aria-atomic="true" class="fr-sr-only" data-testid="admin-users-status">
      <p>{{ statusMessage }}</p>
    </div>

    <!-- Bannière (pas un remplacement) : une erreur de refetch ne doit pas démonter la table
         déjà chargée — ni les modals d'édition ouverts dans ses lignes (#1830). -->
    <div v-if="hasError" class="fr-alert fr-alert--error fr-mb-2w" data-testid="admin-users-error">
      <p>{{ errorMessages.ERR_LOAD_USERS }}</p>
    </div>

    <div v-if="isLoading && !hasLoadedOnce" class="fr-alert fr-alert--info" data-testid="admin-users-loading">
      <p>Chargement des utilisateurs...</p>
    </div>

    <div v-else-if="hasLoadedOnce">
      <RefAppTable
        :items="tableRows"
        :columns="tableColumns"
        data-key="id"
        :loading="isLoading"
        :paginator="true"
        :lazy="true"
        :rows="itemsPerPage"
        :first="firstIndex"
        :total-records="data.total"
        :sort-field="sortColumn"
        :sort-order="isSortDescending ? -1 : 1"
        data-testid="admin-users-table"
        @sort="onSort"
        @page="onPage"
      >
        <template #body-role="{ data: row }">
          <span class="fr-badge justify-center" :class="row.role.badgeClass">{{ row.role.label }}</span>
        </template>

        <template #body-isBlocked="{ data: row }">
          <span
            class="fr-badge justify-center"
            :class="row.isBlocked ? 'fr-badge--error' : 'fr-badge--success'"
            data-testid="admin-user-status-badge"
          >
            {{ row.isBlocked ? "Bloqué" : "Actif" }}
          </span>
        </template>

        <template #body-lastPermissionChangeAt="{ data: row }">
          <template v-if="row.lastPermissionChangeAt.date">
            <span>{{ formatDateFR(row.lastPermissionChangeAt.date) }}</span>
            <br />
            <span class="fr-text--sm fr-text-mention--grey">
              Par : {{ row.lastPermissionChangeAt.email ?? "Système / utilisateur supprimé"
              }}{{ row.lastPermissionChangeAt.impersonatorEmail ? ` (via ${row.lastPermissionChangeAt.impersonatorEmail})` : "" }}
            </span>
          </template>
          <span v-else class="fr-text-mention--grey">Jamais modifié</span>
        </template>

        <template #body-additionalPermissions="{ data: row }">
          <span v-show="row.additionalPermissions.length" class="fr-badge ml-2" :title="row.additionalPermissions.join(', ')">{{
            row.additionalPermissions.length
          }}</span>
        </template>

        <template #body-actions="{ data: row }">
          <UserActions :user="row.actions" @user-updated="fetchUsers" />
        </template>

        <template #body-consultation="{ data: row }">
          <div class="user-consultation">
            <UserPermissionsModal :user="row.actions" />
            <DsfrButton
              label="Connexions"
              size="sm"
              secondary
              data-testid="admin-user-connexions-btn"
              :title="`Voir l'historique des connexions de ${row.email}`"
              :aria-label="`Voir l'historique des connexions de ${row.email}`"
              @click="showConnexionHistory(row.actions)"
            />
          </div>
        </template>
      </RefAppTable>
    </div>

    <DsfrModal
      :opened="connexionHistoryUser !== null"
      size="lg"
      :title="`Historique des connexions — ${connexionHistoryUser?.email ?? ''}`"
      data-testid="admin-user-connexions-modal"
      @close="connexionHistoryUser = null"
    >
      <UserConnexionLogHistory v-if="connexionHistoryUser" :key="connexionHistoryUser.id" :user-id="connexionHistoryUser.id" />
    </DsfrModal>
  </div>
</template>

<style scoped>
.user-consultation {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
}
</style>
