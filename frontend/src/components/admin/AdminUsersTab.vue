<script setup lang="ts">
import api from "@/api/index";
import type { PaginatedUserWithPermissions, UserControllerFindAllData } from "@/client/types.gen";
import RefAppTable from "@/components/RefAppTable.vue";
import { formatDateFR } from "@/composables/use-date";
import type { TableColumn, TableSortEvent } from "@/types/table";
import { RolesWording, RolesWordingBadgeClass } from "@/utils/roles-utils";
import type { DsfrDataTableHeaderCellObject } from "@gouvminint/vue-dsfr";
import type { DataTablePageEvent } from "primevue/datatable";
import { watchDebounced } from "@vueuse/core";
import { computed, onMounted, ref, watch } from "vue";
import UserActions from "./UserActions.vue";

const errorMessages = {
  ERR_LOAD_USERS: "Erreur lors du chargement des utilisateurs",
} as const;

type ErrorKey = keyof typeof errorMessages;

const data = ref<PaginatedUserWithPermissions>({ results: [], total: 0 });

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
    key: "permissions",
    label: "Permissions",
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

const isLoading = ref(false);
// Ne démonter la table qu'au chargement INITIAL : le `v-if isLoading` historique remplaçait la
// table par l'alerte de chargement à CHAQUE refetch, démontant les `UserActions` des lignes et
// fermant donc tout modal d'édition ouvert (#1830). Les refetchs suivants passent par l'état
// `loading` de RefAppTable, qui garde la table (et ses modals) montée.
const hasLoadedOnce = ref(false);
const errorKeySet = ref<Set<ErrorKey>>(new Set());
const searchQuery = ref("");

const sortColumn = ref<(typeof headers)[number]["key"]>("email");
const isSortDescending = ref<boolean>(false);

const itemsPerPage = ref<number>(15);
const currentPage = ref<number>(0);
const firstIndex = computed(() => currentPage.value * itemsPerPage.value);

// RGAA-084 (7.5) : message de statut sur le nombre de résultats, restitué aux TA.
const statusMessage = computed(() => {
  if (isLoading.value) return "Chargement des utilisateurs…";
  const total = data.value.total;
  if (total === 0) return "Aucune donnée ne correspond à votre recherche : Résultat 0 à 0";
  const from = firstIndex.value + 1;
  const to = Math.min(firstIndex.value + data.value.results.length, total);
  return `Résultat ${from} à ${to} sur ${total}`;
});

async function fetchUsers() {
  try {
    isLoading.value = true;

    const query: NonNullable<UserControllerFindAllData["query"]> = {
      search: searchQuery.value || undefined,
      page: currentPage.value,
      pageSize: itemsPerPage.value,
      sortBy: sortColumn.value,
      order: isSortDescending.value ? "desc" : "asc",
    };

    const response = await api.userControllerFindAll({ query });

    if (response.response.ok && response.data) {
      data.value = response.data;
      errorKeySet.value.delete("ERR_LOAD_USERS");
      hasLoadedOnce.value = true;
    } else {
      errorKeySet.value.add("ERR_LOAD_USERS");
      console.error(response.error);
    }
  } finally {
    isLoading.value = false;
  }
}

watchDebounced(
  searchQuery,
  async () => {
    currentPage.value = 0;
    await fetchUsers();
  },
  { debounce: 300 },
);

watch([sortColumn, isSortDescending], () => {
  currentPage.value = 0;
  fetchUsers();
});

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

function onSort(event: TableSortEvent) {
  sortColumn.value = (event.sortField as (typeof headers)[number]["key"]) || "email";
  isSortDescending.value = event.sortOrder === -1;
}

function onPage(event: DataTablePageEvent) {
  currentPage.value = event.page;
  itemsPerPage.value = event.rows;
  fetchUsers();
}

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
    <div v-if="errorKeySet.size" class="fr-alert fr-alert--error fr-mb-2w" data-testid="admin-users-error">
      <p v-for="errorKey in Array.from(errorKeySet.keys())" :key="errorKey">
        {{ errorMessages[errorKey] }}
      </p>
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

        <template #body-permissions="{ data: row }">
          <UserPermissionsModal :user="row.actions" />
        </template>
      </RefAppTable>
    </div>
  </div>
</template>
