<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import api from "@/api/index";
import type { UserEntity } from "@/client/types.gen";
import { useToasterStore } from "@/stores/toasterStore";
import { AdminLevel } from "@/models/user";
import { AdminLevelOptions, AdminLevelWording, AdminLevelWordingBadgeClass } from "@/utils/admin-level-utils";
import PaginationFooter from "../PaginationFooter.vue";

const toaster = useToasterStore();

const errorMessages = {
  ERR_LOAD_USERS: "Erreur lors du chargement des utilisateurs",
} as const;

type ErrorKey = keyof typeof errorMessages;

const userList = ref<UserEntity[]>([]);
const isLoading = ref(false);
const errorKeySet = ref<Set<ErrorKey>>(new Set());
const isEditModalOpen = ref(false);
const selectedUser = ref<UserEntity | null>(null);
const isSaving = ref(false);
const searchQuery = ref("");
const editingAdminLevel = ref<AdminLevel>(AdminLevel.NONE);

const sortColumn = ref<string>("Email");
const isSortDescending = ref<boolean>(false);

const itemsPerPage = ref<number>(10);
const currentPage = ref<number>(0);
const remoteTotalCount = ref<number | null>(null);

const columnToFieldKeyMap: Record<string, keyof UserEntity> = {
  Email: "email",
  "ID Keycloak": "keycloakId",
  "Dernière connexion": "lastLogin",
  Permissions: "adminLevel",
};

async function fetchUsers() {
  try {
    isLoading.value = true;
    const fieldKey = columnToFieldKeyMap[sortColumn.value] ?? "email";

    const query: Record<string, any> = {
      search: searchQuery.value.trim() || undefined,
      page: currentPage.value + 1,
      itemsPerPage: itemsPerPage.value,
      sortColumn: fieldKey,
      isSortDescending: isSortDescending.value,
    };

    const response = await api.userControllerFindAll({ query });

    if (response.response.ok && response.data) {
      const items = response.data as UserEntity[];

      if (items.length === 0 && currentPage.value > 0) {
        if (remoteTotalCount.value == null) {
          remoteTotalCount.value = currentPage.value * itemsPerPage.value;
        }
        currentPage.value = Math.max(0, currentPage.value - 1);
        await fetchUsers();
        return;
      }

      userList.value = items;

      try {
        const totalHeader = (response.response as any)?.headers?.get?.("X-Total-Count");
        remoteTotalCount.value = totalHeader ? Number(totalHeader) : remoteTotalCount.value;
      } catch {
      }

      errorKeySet.value.delete("ERR_LOAD_USERS");
    } else {
      userList.value = [];
      errorKeySet.value.add("ERR_LOAD_USERS");
      console.error(response.error);
    }
  } finally {
    isLoading.value = false;
  }
}

async function onSearch() {
  await fetchUsers();
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
  userList.value.map(user => ({
    Email: user.email,
    "ID Keycloak": user.keycloakId,
    "Dernière connexion": user.lastLogin ? new Date(user.lastLogin).toLocaleString("fr-FR") : "",
    Permissions: {
      level: user.adminLevel,
      label: AdminLevelWording[user.adminLevel],
      badgeClass: AdminLevelWordingBadgeClass[user.adminLevel],
    },
    Actions: user,
  })),
);

const totalRowCount = computed(() => {
  if (remoteTotalCount.value != null && Number.isFinite(remoteTotalCount.value)) {
    return remoteTotalCount.value;
  }
  return currentPage.value * itemsPerPage.value + userList.value.length;
});
const totalPageCount = computed(() => Math.max(1, Math.ceil(totalRowCount.value / itemsPerPage.value)));
const paginationPages = computed(() =>
  Array.from({ length: totalPageCount.value }).map((_, index) => ({
    label: String(index + 1),
    title: `Page ${index + 1}`,
    href: `#page-${index + 1}`,
  })),
);

watch([itemsPerPage, totalRowCount], () => {
  if (currentPage.value > totalPageCount.value - 1) currentPage.value = 0;
});

function onUpdateSortColumn(columnName: string | undefined) {
  const proposedColumn = columnName || "Email";
  if (proposedColumn === "Actions") {
    return;
  }
  sortColumn.value = proposedColumn;
}

function openEditModal(user: UserEntity) {
  selectedUser.value = user;
  editingAdminLevel.value = user.adminLevel;
  isEditModalOpen.value = true;
}

function closeEditModal() {
  isEditModalOpen.value = false;
  selectedUser.value = null;
  editingAdminLevel.value = AdminLevel.NONE;
}

async function savePermissions() {
  if (!selectedUser.value) return;
  isSaving.value = true;
  try {
    await api.userControllerUpdate({
      path: { id: selectedUser.value.keycloakId },
      body: { adminLevel: editingAdminLevel.value },
    });
    toaster.addSuccessMessage("Permissions mises à jour avec succès");
    closeEditModal();
    await fetchUsers();
  } catch (err) {
    toaster.addErrorMessage("Erreur lors de la mise à jour des permissions");
    console.error(err);
  } finally {
    isSaving.value = false;
  }
}

function updateItemsPerPage(value: number | string) {
  const numericValue = Number(value as any);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return;
  itemsPerPage.value = numericValue;
  currentPage.value = 0;
  fetchUsers();
}
function updatePage(value: number | string | { page: number | string }) {
  const rawValue = typeof value === "object" && value !== null ? (value as any).page : value;
  const numericValue = Number(rawValue as any);
  if (!Number.isFinite(numericValue)) return;
  const maxIndex = totalPageCount.value - 1;
  currentPage.value = Math.max(0, Math.min(numericValue, maxIndex));
  fetchUsers();
}

onMounted(fetchUsers);
</script>

<template>
  <div>
    <h1 class="fr-h1" data-testid="admin-users-title">
      Gestion des utilisateurs
    </h1>
    <p class="fr-text--lg">
      Gérez les permissions des utilisateurs de l'application
    </p>

    <div class="fr-mb-4w">
      <DsfrSearchBar
        v-model="searchQuery"
        label="Rechercher un utilisateur"
        placeholder="Rechercher par email ou ID Keycloak..."
        button-text="Rechercher"
        class="fr-col-12"
        data-testid="admin-user-search"
        @search="onSearch"
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
        title="Utilisateurs"
        no-caption
        :headers-row="['Email', 'ID Keycloak', 'Dernière connexion', 'Permissions', 'Actions']"
        :rows="tableRows"
        :sortable-rows="['Email', 'ID Keycloak', 'Dernière connexion', 'Permissions']"
        vertical-borders
        :pagination="false"
        data-testid="admin-users-table"
        @update:sorted-by="onUpdateSortColumn"
      >
        <template #cell="{ colKey, cell }">
          <template v-if="colKey === 'Permissions'">
            <span class="fr-badge" :class="cell.badgeClass">{{ cell.label }}</span>
          </template>

          <template v-else-if="colKey === 'Actions'">
            <DsfrButton
              label="Modifier"
              size="sm"
              secondary
              data-testid="admin-user-edit-btn"
              @click="openEditModal(cell)"
            />
          </template>

          <template v-else>
            <span class="truncate">{{ cell }}</span>
          </template>
        </template>
      </DsfrDataTable>
      <PaginationFooter
        :total-filtered="totalRowCount"
        :pages="paginationPages"
        :limit="itemsPerPage"
        :page="currentPage"
        data-testid="admin-users-pagination-footer"
        @update:limit="updateItemsPerPage"
        @update:page="updatePage"
      />
    </div>

    <DsfrModal
      :opened="isEditModalOpen"
      title="Modifier les permissions utilisateur"
      data-testid="admin-edit-user-modal"
      @close="closeEditModal"
    >
      <div v-if="selectedUser">
        <p><strong>Utilisateur :</strong> {{ selectedUser.email }}</p>
        <p><strong>ID Keycloak :</strong> {{ selectedUser.keycloakId }}</p>

        <div class="fr-form-group">
          <fieldset class="fr-fieldset">
            <DsfrRadioButtonSet
              v-model="editingAdminLevel"
              legend="Niveau de privilège"
              hint=""
              :options="AdminLevelOptions"
              name="admin-level-radio"
              data-testid="admin-level-radio"
            />
          </fieldset>
        </div>
      </div>

      <template #footer>
        <DsfrButton label="Annuler" secondary data-testid="admin-cancel-btn" @click="closeEditModal" />
        <DsfrButton label="Sauvegarder" :disabled="isSaving" data-testid="admin-save-perms-btn" @click="savePermissions" />
      </template>
    </DsfrModal>
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
