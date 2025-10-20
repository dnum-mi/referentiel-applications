<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import api from "@/api/index";
import type { UsersPaginatedResponseDto } from "@/client/types.gen";
import { AdminLevelWording, AdminLevelWordingBadgeClass } from "@/utils/admin-level-utils";
import PaginationFooter from "../PaginationFooter.vue";
import type { DsfrDataTableHeaderCellObject } from "@gouvminint/vue-dsfr";
import UserActions from "./UserActions.vue";

const errorMessages = {
  ERR_LOAD_USERS: "Erreur lors du chargement des utilisateurs",
} as const;

type ErrorKey = keyof typeof errorMessages;

const data = ref<UsersPaginatedResponseDto>({ results: [], total: 0 });

const headers: (DsfrDataTableHeaderCellObject & { isSortable?: boolean })[] = [{
  key: "email",
  label: "Email",
  isSortable: true,
}, {
  key: "organisation",
  label: "Organisation",
  isSortable: true,
}, {
  key: "lastLogin",
  label: "Dernière connexion",
  isSortable: true,
}, {
  key: "adminLevel",
  label: "Niveau d'admin",
  isSortable: true,
}, {
  key: "capabilities",
  isSortable: true,
  label: "Nb Cap.",
}, {
  key: "actions",
  label: "Actions",
}] as const;

const isLoading = ref(false);
const errorKeySet = ref<Set<ErrorKey>>(new Set());
const searchQuery = ref("");

const sortColumn = ref<typeof headers[number]["key"]>("email");
const isSortDescending = ref<boolean>(false);

const itemsPerPage = ref<number>(15);
const currentPage = ref<number>(0);

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

let searchDebounceTimeout: number | undefined;
watch(searchQuery, async (newValue) => {
  if (searchDebounceTimeout) window.clearTimeout(searchDebounceTimeout);
  searchDebounceTimeout = window.setTimeout(async () => {
    if (searchQuery.value === newValue) {
      currentPage.value = 0;
      await fetchUsers();
    }
  }, 300);
});

watch([sortColumn, isSortDescending], () => {
  currentPage.value = 0;
  fetchUsers();
});

const tableRows = computed(() =>
  data.value.results.map(user => ({
    email: user.email,
    organisation: user.organization?.path || "-",
    lastLogin: user.lastLogin ? new Date(user.lastLogin).toLocaleString("fr-FR") : "",
    capabilities: user.capabilities,
    adminLevel: {
      label: AdminLevelWording[user.adminLevel],
      badgeClass: AdminLevelWordingBadgeClass[user.adminLevel],
    },
    actions: user,
  })),
);

function onUpdateSortColumn(columnName: string | undefined) {
  sortColumn.value = columnName || "email";
}

function updateItemsPerPage(value: number) {
  itemsPerPage.value = value;
  currentPage.value = 0;
  fetchUsers();
}
function updatePage(value: number) {
  currentPage.value = value;
  fetchUsers();
}

onMounted(fetchUsers);
</script>

<template>
  <div>
    <h1 class="fr-h1" data-testid="admin-users-title">
      Gestion des utilisateurs
    </h1>

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
      <DsfrDataTable
        :key="`${currentPage}-${itemsPerPage}-${sortColumn}-${isSortDescending}`"
        v-model:sorted-by="sortColumn"
        v-model:sorted-desc="isSortDescending"
        :sort-fn="(a, b) => (isSortDescending ? -1 : 1)"
        title="Utilisateurs"
        no-caption
        :headers-row="headers"
        :rows="tableRows"
        row-key="email"
        :sortable-rows="headers.filter(h => h.isSortable).map(h => h.key)"
        vertical-borders
        :pagination="false"
        data-testid="admin-users-table"
        @update:sorted-by="onUpdateSortColumn"
      >
        <template #header="header">
          <DsfrTableHeader
            :header="header.label"
            :aria-sort="isSortDescending ? 'descending' : 'ascending'"
          />
        </template>
        <template #cell="{ colKey, cell }">
          <template v-if="colKey === 'adminLevel'">
            <span class="fr-badge justify-center" :class="(cell as any).badgeClass">{{ (cell as any).label }}</span>
          </template>
          <template v-else-if="colKey === 'capabilities'">
            <span v-show="cell.length" class="fr-badge ml-2" :title="cell.join(', ')">{{ cell.length }}</span>
          </template>
          <template v-else-if="colKey === 'actions'">
            <UserActions :user="cell" @user-updated="fetchUsers" />
          </template>

          <template v-else>
            <span class="truncate">{{ cell }}</span>
          </template>
        </template>
      </DsfrDataTable>
      <PaginationFooter
        :total-filtered="data.total"
        :limit="itemsPerPage"
        :page="currentPage"
        data-testid="admin-users-pagination-footer"
        @update:limit="updateItemsPerPage"
        @update:page="updatePage"
      />
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
