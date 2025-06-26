<template>
  <div class="fr-container">
    <DsfrTabs v-model="activeTab" tab-list-name="Administration">
      <template #tab-items>
        <DsfrTabItem
          v-for="(tab, index) in tabs"
          :key="index"
          :tab-id="`tab-${index}`"
          :panel-id="`tab-content-${index}`"
          :icon="tab.icon"
          @click="activeTab = index"
        >
          {{ tab.title }}
        </DsfrTabItem>
      </template>

      <template v-for="(tab, index) in tabs" :key="index">
        <DsfrTabContent v-show="activeTab === index" :panel-id="`tab-content-${index}`" :tab-id="`tab-${index}`">
          <template v-if="index === 0">
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

            <div v-else-if="error" class="fr-alert fr-alert--error">
              <p>{{ error }}</p>
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
                          <span
                            v-for="(permission, index) in getUserPermissions(user)"
                            :key="index"
                            :class="getPermissionBadgeClass(permission)"
                            class="fr-badge fr-mr-1w"
                          >
                            {{ permission.trim() }}
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

            <!-- Modal de modification des permissions -->
            <DsfrModal :opened="isEditModalOpen" title="Modifier les permissions utilisateur" @close="closeEditModal">
              <div v-if="selectedUser">
                <p><strong>Utilisateur :</strong> {{ selectedUser.email }}</p>
                <p><strong>ID Keycloak :</strong> {{ selectedUser.keycloakId }}</p>

                <div class="fr-form-group">
                  <fieldset class="fr-fieldset">
                    <legend class="fr-fieldset__legend fr-text--regular">Permissions</legend>
                    <div class="fr-fieldset__content">
                      <div class="fr-checkbox-group">
                        <input id="perm-read" type="checkbox" v-model="editingPermissions.read" />
                        <label class="fr-label" for="perm-read"> Lecture (read) - Consulter les applications </label>
                      </div>
                      <div class="fr-checkbox-group">
                        <input id="perm-write" type="checkbox" v-model="editingPermissions.write" />
                        <label class="fr-label" for="perm-write"> Écriture (write) - Modifier les applications </label>
                      </div>
                      <div class="fr-checkbox-group">
                        <input id="perm-admin" type="checkbox" v-model="editingPermissions.admin" />
                        <label class="fr-label" for="perm-admin">
                          Administrateur (admin) - Tous les droits + gestion des utilisateurs + export Excel
                        </label>
                      </div>
                    </div>
                  </fieldset>
                </div>
              </div>

              <template #footer>
                <DsfrButton label="Annuler" secondary @click="closeEditModal" />
                <DsfrButton label="Sauvegarder" @click="savePermissions" :disabled="saving" />
              </template>
            </DsfrModal>
          </template>
          <template v-else-if="index === 1">
            <h1 class="fr-h1">Gestion de l'indice de qualité</h1>
            <DsfrButton
              :label="loading ? 'Mise à jour en cours...' : 'Calculer l’indice de qualité de toutes les applications'"
              :icon="{ name: 'ri-refresh-line', animation: loading ? 'spin' : undefined }"
              :disabled="loading"
              :secondary="false"
              @click="updateAllApplicationsQuality"
            />
          </template>
        </DsfrTabContent>
      </template>
    </DsfrTabs>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import type { User } from "@/models/user";
import Users from "@/api/user";
import useToaster from "@/composables/use-toaster";
import Applications from "@/api/application";

const toaster = useToaster();

const users = ref<User[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const isEditModalOpen = ref(false);
const selectedUser = ref<User | null>(null);
const saving = ref(false);
const searchQuery = ref("");
const activeTab = ref(0);

const editingPermissions = ref({
  read: false,
  write: false,
  admin: false,
});

const tabs = [
  {
    title: "Gestion des utilisateurs",
    icon: "ri-user-settings-line",
  },
  {
    title: "Indice de qualité",
    icon: "ri-bar-chart-line",
  },
];

onMounted(async () => {
  await loadUsers();
});

watch(searchQuery, async (newQuery) => {
  setTimeout(async () => {
    if (searchQuery.value === newQuery) {
      await loadUsers();
    }
  }, 300);
});

async function loadUsers() {
  loading.value = true;
  error.value = null;
  try {
    users.value = (await Users.getAllUsers()) || [];
    const filters = searchQuery.value.trim() ? { search: searchQuery.value.trim() } : undefined;
    users.value = (await Users.getAllUsers(filters)) || [];
  } catch (err) {
    error.value = "Erreur lors du chargement des utilisateurs";
    console.error(err);
  } finally {
    loading.value = false;
  }
}

async function handleSearch() {
  await loadUsers();
}

function getUserPermissions(user: User): string[] {
  if (!user.permissions) return ["Aucune permission"];
  return user.permissions
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

function getPermissionBadgeClass(permission: string): string {
  switch (permission) {
    case "admin":
      return "fr-badge--error";
    case "write":
      return "fr-badge--warning";
    case "read":
      return "fr-badge--info";
    default:
      return "fr-badge--new";
  }
}

function openEditModal(user: User) {
  selectedUser.value = user;
  const permissions = getUserPermissions(user);
  editingPermissions.value = {
    read: permissions.includes("read"),
    write: permissions.includes("write"),
    admin: permissions.includes("admin"),
  };
  isEditModalOpen.value = true;
}

function closeEditModal() {
  isEditModalOpen.value = false;
  selectedUser.value = null;
  editingPermissions.value = {
    read: false,
    write: false,
    admin: false,
  };
}

async function savePermissions() {
  if (!selectedUser.value) return;

  saving.value = true;
  try {
    const permissions = [];
    if (editingPermissions.value.read) permissions.push("read");
    if (editingPermissions.value.write) permissions.push("write");
    if (editingPermissions.value.admin) permissions.push("admin");

    const permissionsString = permissions.join(",");

    await Users.updateUserPermissions(selectedUser.value.keycloakId, permissionsString);

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
</script>
