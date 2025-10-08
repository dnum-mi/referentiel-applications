<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import api from "@/api/index";
import type { UserEntity, UpdateUserDto, PaginatedResponseDto } from "@/client/types.gen";
import { useToasterStore } from "@/stores/toasterStore";
import { AdminLevel } from "@/models/user";
import { AdminLevelOptions, AdminLevelWording, AdminLevelWordingBadgeClass } from "@/utils/admin-level-utils";
import PaginationFooter from "../PaginationFooter.vue";
import OrganizationSearchSelect from "../common/OrganizationSearchSelect.vue";

const toaster = useToasterStore();

const errorMessages = {
  ERR_LOAD_USERS: "Erreur lors du chargement des utilisateurs",
} as const;

type ErrorKey = keyof typeof errorMessages;

const data = ref<PaginatedResponseDto & { results: UserEntity[] }>({ results: [], total: 0 });
const isLoading = ref(false);
const errorKeySet = ref<Set<ErrorKey>>(new Set());
const isEditModalOpen = ref(false);
const selectedUser = ref<UserEntity | null>(null);
const isSaving = ref(false);
const searchQuery = ref("");
const editingAdminLevel = ref<AdminLevel>(AdminLevel.NONE);
const editingOrganizationId = ref<string>("");

const sortColumn = ref<string>("Email");
const isSortDescending = ref<boolean>(false);

const itemsPerPage = ref<number>(15);
const currentPage = ref<number>(0);

const columnToFieldKeyMap: Record<string, string> = {
  Email: "email",
  Organisation: "Organisation",
  "Dernière connexion": "lastLogin",
  Permissions: "adminLevel",
};

async function fetchUsers() {
  try {
    isLoading.value = true;

    const query: Record<string, any> = {
      search: searchQuery.value.trim() || undefined,
      page: currentPage.value,
      pageSize: itemsPerPage.value,
      sortBy: columnToFieldKeyMap[sortColumn.value],
      order: isSortDescending.value ? "desc" : "asc",
    };

    const response = await api.userControllerFindAll({ query });

    if (response.response.ok && response.data) {
      data.value = response.data as PaginatedResponseDto & { results: UserEntity[] };
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
    Email: user.email,
    Organisation: user.organization?.label || "Non renseignée",
    "Dernière connexion": user.lastLogin ? new Date(user.lastLogin).toLocaleString("fr-FR") : "",
    Permissions: {
      label: AdminLevelWording[user.adminLevel],
      badgeClass: AdminLevelWordingBadgeClass[user.adminLevel],
    },
    Actions: user,
  })),
);

function onUpdateSortColumn(columnName: string | undefined) {
  sortColumn.value = columnName || "Email";
}

async function openEditModal(user: UserEntity) {
  selectedUser.value = user;
  editingAdminLevel.value = user.adminLevel;
  editingOrganizationId.value = user.organizationId || "";
  isEditModalOpen.value = true;
}

function closeEditModal() {
  isEditModalOpen.value = false;
  selectedUser.value = null;
  editingAdminLevel.value = AdminLevel.NONE;
  editingOrganizationId.value = "";
}

async function savePermissions() {
  if (!selectedUser.value || !selectedUser.value.keycloakId) return;
  isSaving.value = true;
  try {
    await api.userControllerUpdate({
      path: { id: selectedUser.value.keycloakId },
      body: {
        adminLevel: editingAdminLevel.value,
        organizationId: editingOrganizationId.value === "" ? null : editingOrganizationId.value,
      } as UpdateUserDto,
    });
    toaster.addSuccessMessage("Utilisateur mis à jour avec succès");
    closeEditModal();
    await fetchUsers();
  } catch (err) {
    toaster.addErrorMessage("Erreur lors de la mise à jour de l'utilisateur");
    console.error(err);
  } finally {
    isSaving.value = false;
  }
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
        v-model="searchQuery"
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
        :headers-row="['Email', 'Organisation', 'Dernière connexion', 'Permissions', 'Actions']"
        :rows="tableRows"
        :sortable-rows="['Email', 'Organisation', 'Dernière connexion', 'Permissions']"
        vertical-borders
        :pagination="false"
        data-testid="admin-users-table"
        @update:sorted-by="onUpdateSortColumn"
      >
        <template #header="header">
          <DsfrTableHeader
            :header="header.key"
            :aria-sort="isSortDescending ? 'descending' : 'ascending'"
          />
        </template>
        <template #cell="{ colKey, cell }">
          <template v-if="colKey === 'Permissions'">
            <span class="fr-badge" :class="(cell as any).badgeClass">{{ (cell as any).label }}</span>
          </template>

          <template v-else-if="colKey === 'Actions'">
            <DsfrButton
              label="Modifier"
              size="sm"
              secondary
              data-testid="admin-user-edit-btn"
              title="Modifier les permissions de l'utilisateur"
              aria-label="Modifier les permissions de l'utilisateur"
              @click="openEditModal(cell as UserEntity)"
            />
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

    <DsfrModal
      :opened="isEditModalOpen"
      title="Modifier l'utilisateur"
      data-testid="admin-edit-user-modal"
      @close="closeEditModal"
    >
      <div v-if="selectedUser">
        <p><strong>Utilisateur :</strong> {{ selectedUser.email }}</p>

        <OrganizationSearchSelect
          v-model="editingOrganizationId"
          class="fr-mb-2w"
          description="Recherchez et sélectionnez une organisation pour cet utilisateur"
          :initial-organization="selectedUser.organization"
          data-testid="user-organization-search"
        />

        <DsfrRadioButtonSet
          v-model="editingAdminLevel"
          legend="Niveau de privilège"
          :options="AdminLevelOptions"
          name="admin-level-radio"
          data-testid="admin-level-radio"
        />
      </div>

      <template #footer>
        <DsfrButton
          label="Annuler" secondary data-testid="admin-cancel-btn"
          title="Annuler la modification"
          aria-label="Annuler la modification"
          @click="closeEditModal"
        />
        <DsfrButton
          label="Sauvegarder"
          title="Sauvegarder les modifications"
          aria-label="Sauvegarder les modifications"
          :disabled="isSaving" data-testid="admin-save-perms-btn" @click="savePermissions"
        />
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
