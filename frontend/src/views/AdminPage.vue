<script setup lang="ts">
import { ref, watch } from "vue";
import { AdminLevel, type User } from "@/models/user";
import Users from "@/api/user";
import AppPermsMatrixApi from "@/api/admin/app-perms-matrix";
import useToaster from "@/composables/use-toaster";
import Applications from "@/api/application";
import type { AppPermsMatrix } from "@/models/Application";
import type { Tab } from "@/utils/types";
import { AdminLevelOptions, AdminLevelWording, AdminLevelWordingBadgeClass } from "@/utils/admin-level-utils";

const errorMessages = {
  ERR_LOAD_USERS: "Erreur lors du chargement des utilisateurs",
  ERR_LOAD_APP_MATRIX: "Erreur lors du chargement de la matrice des permissions",
};

const toaster = useToaster();

const users = ref<User[]>([]);
const loading = ref(false);
const errors = ref<Set<keyof typeof errorMessages>>(new Set());
const isEditModalOpen = ref(false);
const selectedUser = ref<User | null>(null);
const saving = ref(false);
const searchQuery = ref("");
const activeTab = ref(0);
const appPermsMatrix = ref<AppPermsMatrix>();

const editingAdminLevel = ref<AdminLevel>(AdminLevel.NONE);

// Tabs consist of 4 main keys and an optional load function who comes always with a error key
const tabs: Tab<typeof errorMessages>[] = [
  {
    title: "Gestion des utilisateurs",
    icon: "ri-user-settings-line",
    tabId: "tab-users",
    panelId: "panel-users",
    loadFn: loadUsers,
    errorKey: "ERR_LOAD_USERS",
  },
  {
    title: "Indice de qualité",
    icon: "ri-bar-chart-line",
    tabId: "tab-quality",
    panelId: "panel-quality",
  },
  {
    title: "Matrice des permissions",
    icon: "ri-shield-user-line",
    tabId: "tab-app-perms-matrix",
    panelId: "panel-app-perms-matrix",
    loadFn: loadAppPermissionsMatrix,
    errorKey: "ERR_LOAD_APP_MATRIX",
  },
];

watch(
  activeTab,
  async (tabIndex) => {
    const tab = tabs[tabIndex];
    if (tab.loadFn) {
      loading.value = true;
      try {
        await tab.loadFn();
        errors.value.delete(tab.errorKey);
      } catch (err) {
        errors.value.add(tab.errorKey);
        console.error(err);
      } finally {
        loading.value = false;
      }
    }
  },
  { immediate: true },
);

watch(searchQuery, async (newQuery) => {
  setTimeout(async () => {
    if (searchQuery.value === newQuery) {
      await loadUsers();
    }
  }, 300);
});

async function loadUsers() {
  try {
    const filters = searchQuery.value.trim() ? { search: searchQuery.value.trim() } : undefined;
    users.value = (await Users.getAllUsers(filters)) || [];
    errors.value.delete("ERR_LOAD_USERS");
  } catch (err) {
    errors.value.add("ERR_LOAD_USERS");
    console.error(err);
  }
}

async function loadAppPermissionsMatrix() {
  try {
    appPermsMatrix.value = await AppPermsMatrixApi.get();
    errors.value.delete("ERR_LOAD_APP_MATRIX");
  } catch (err) {
    errors.value.add("ERR_LOAD_APP_MATRIX");
    console.error(err);
  }
}

async function handleSearch() {
  await loadUsers();
}

function openEditModal(user: User) {
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

  saving.value = true;
  try {
    await Users.updateUserAdminLevel(selectedUser.value.keycloakId, editingAdminLevel.value);

    toaster.addSuccessMessage("Permissions mises à jour avec succès");
    closeEditModal();
    await loadUsers();
  } catch (err) {
    toaster.addErrorMessage("Erreur lors de la mise à jour des permissions");
    console.error(err);
  } finally {
    saving.value = false;
  }
}

const updateAllApplicationsQuality = async () => {
  loading.value = true;
  try {
    const message = await Applications.patchApplicationsQuality();
    toaster.addSuccessMessage(message);
  } catch (err) {
    toaster.addErrorMessage("Erreur lors de la mise à jour des IQ");
    console.error(err);
  } finally {
    loading.value = false;
  }
};

function saveAppPermsMatrix(matrix: AppPermsMatrix) {
  AppPermsMatrixApi.update(matrix)
    .then((data) => {
      toaster.addSuccessMessage("Matrice des permissions mise à jour avec succès");
      appPermsMatrix.value = data;
    })
    .catch((err) => {
      toaster.addErrorMessage("Erreur lors de la mise à jour de la matrice des permissions");
      console.error(err);
    });
}
</script>

<template>
  <div class="fr-container">
    <DsfrTabs v-model="activeTab" tab-list-name="Administration" :tab-titles="tabs">
      <DsfrTabContent :panel-id="tabs[0].panelId" :tab-id="tabs[0].tabId">
        <h1 class="fr-h1">Gestion des utilisateurs</h1>
        <p class="fr-text--lg">Gérez les permissions des utilisateurs de l'application</p>
        <div class="fr-mb-4w">
          <DsfrSearchBar
            v-model="searchQuery"
            label="Rechercher un utilisateur"
            placeholder="Rechercher par email ou ID Keycloak..."
            @search="handleSearch"
            :button-text="'Rechercher'"
            class="fr-col-12"
          />
        </div>

        <div v-if="loading" class="fr-alert fr-alert--info">
          <p>Chargement des utilisateurs...</p>
        </div>

        <div v-else-if="errors.size" class="fr-alert fr-alert--error">
          <p v-for="errorKey in errors.keys()" :key="errorKey">{{ errorMessages[errorKey] }}</p>
        </div>

        <div v-else class="fr-card">
          <div class="fr-card__body">
            <div class="fr-table fr-table--bordered">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Email</th>
                    <th scope="col">ID Keycloak</th>
                    <th scope="col">Derniere Connection</th>
                    <th scope="col">Permissions actuelles</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="user in users" :key="user.keycloakId">
                    <td>{{ user.email }}</td>
                    <td>
                      <code>{{ user.keycloakId }}</code>
                    </td>
                    <td>
                      {{ new Date(user.lastLogin).toLocaleString() }}
                    </td>
                    <td>
                      <span class="fr-badge fr-mr-1w" :class="AdminLevelWordingBadgeClass[user.adminLevel]">
                        {{ AdminLevelWording[user.adminLevel] }}
                      </span>
                    </td>
                    <td>
                      <DsfrButton label="Modifier" size="sm" secondary @click="openEditModal(user)" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <DsfrModal :opened="isEditModalOpen" title="Modifier les permissions utilisateur" @close="closeEditModal">
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
                ></DsfrRadioButtonSet>
              </fieldset>
            </div>
          </div>

          <template #footer>
            <DsfrButton label="Annuler" secondary @click="closeEditModal" />
            <DsfrButton label="Sauvegarder" @click="savePermissions" :disabled="saving" />
          </template>
        </DsfrModal>
      </DsfrTabContent>
      <DsfrTabContent :panel-id="tabs[1].panelId" :tab-id="tabs[1].tabId">
        <h1 class="fr-h1">Gestion de l'indice de qualité</h1>
        <DsfrButton
          :label="loading ? 'Mise à jour en cours...' : 'Calculer l’indice de qualité de toutes les applications'"
          :icon="{ name: 'ri-refresh-line', animation: loading ? 'spin' : undefined }"
          :disabled="loading"
          @click="updateAllApplicationsQuality"
        />
      </DsfrTabContent>
      <DsfrTabContent :panel-id="tabs[2].panelId" :tab-id="tabs[2].tabId">
        <AppPermsMatrix
          v-if="appPermsMatrix"
          :app-perms-matrix="appPermsMatrix"
          @reload="loadAppPermissionsMatrix"
          @update:app-perms-matrix="(m: AppPermsMatrix) => saveAppPermsMatrix(m)"
        />
      </DsfrTabContent>
    </DsfrTabs>
  </div>
</template>
