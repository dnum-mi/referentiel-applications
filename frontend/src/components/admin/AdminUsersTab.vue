<script setup lang="ts">
import api from "@/api/index";
import type { PaginatedUserWithPermissions } from "@/client/types.gen";
import RefAppTable from "@/components/RefAppTable.vue";
import type { TableColumn, TableSortEvent } from "@/types/table";
import { RolesWording, RolesWordingBadgeClass } from "@/utils/admin-level-utils";
import type { DsfrDataTableHeaderCellObject } from "@gouvminint/vue-dsfr";
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
    key: "lastLogin",
    label: "Dernière connexion",
    isSortable: true,
  },
  {
    key: "role",
    label: "Role",
    isSortable: true,
  },
  {
    key: "additionalPermissions",
    isSortable: true,
    label: "Nb Cap.",
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
const errorKeySet = ref<Set<ErrorKey>>(new Set());
const searchQuery = ref("");

const sortColumn = ref<(typeof headers)[number]["key"]>("email");
const isSortDescending = ref<boolean>(false);

const itemsPerPage = ref<number>(15);
const currentPage = ref<number>(0);
const firstIndex = computed(() => currentPage.value * itemsPerPage.value);

async function fetchUsers() {
  try {
    isLoading.value = true;

    const query: Record<string, any> = {
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
    email: user.email,
    organisation: user.organization?.path || "-",
    lastLogin: user.lastLogin ? new Date(user.lastLogin).toLocaleString("fr-FR") : "",
    additionalPermissions: user.additionalPermissions,
    role: {
      label: RolesWording[user.role],
      badgeClass: RolesWordingBadgeClass[user.role],
    },
    actions: user,
  })),
);

function onSort(event: TableSortEvent) {
  sortColumn.value = (event.sortField as (typeof headers)[number]["key"]) || "email";
  isSortDescending.value = event.sortOrder === -1;
}

function onPage(event: any) {
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

    <div v-if="isLoading" class="fr-alert fr-alert--info" data-testid="admin-users-loading">
      <p>Chargement des utilisateurs...</p>
    </div>

    <div v-else-if="errorKeySet.size" class="fr-alert fr-alert--error" data-testid="admin-users-error">
      <p v-for="errorKey in Array.from(errorKeySet.keys())" :key="errorKey">
        {{ errorMessages[errorKey] }}
      </p>
    </div>

    <div v-else>
      <RefAppTable
        :items="tableRows"
        :columns="tableColumns"
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
        <template #body-role="{ data }">
          <span class="fr-badge justify-center" :class="data.role.badgeClass">{{ data.role.label }}</span>
        </template>

        <template #body-additionalPermissions="{ data }">
          <span v-show="data.additionalPermissions.length" class="fr-badge ml-2" :title="data.additionalPermissions.join(', ')">{{
            data.additionalPermissions.length
          }}</span>
        </template>

        <template #body-actions="{ data }">
          <UserActions :user="data.actions" @user-updated="fetchUsers" />
        </template>
      </RefAppTable>
    </div>
  </div>
</template>

<style scoped>
.truncate {
  display: inline-block;
  max-width: 60ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
