<script setup lang="ts">
import { useUserStore } from "@/stores/userStore";
import { AdminLevelWording, AdminLevelWordingBadgeClass } from "@/utils/admin-level-utils";

const userStore = useUserStore();
onMounted(() => {
  userStore.fetchUser();
});
</script>

<template>
  <div class="fr-grid-row fr-grid-row--center profil-container" data-testid="user-profile">
    <div class="fr-col-12 fr-col-md-8">
      <h1 class="fr-h1" data-testid="user-profile-main-title">
        Profil utilisateur
      </h1>
      <div v-if="userStore.user" class="fr-card" data-testid="user-profile-card">
        <div class="fr-card__body fr-mt-2w">
          <DsfrTable title="Informations personnelles" data-testid="user-profile-table">
            <tr>
              <th scope="row">
                ID Keycloak
              </th>
              <td data-testid="user-profile-keycloak">
                {{ userStore.user.keycloakId }}
              </td>
            </tr>
            <tr>
              <th scope="row">
                Organisation
              </th>
              <td data-testid="user-profile-organization">
                {{ userStore.user.organization?.label || "Non renseignée" }}
              </td>
            </tr>
            <tr>
              <th scope="row">
                Email
              </th>
              <td data-testid="user-profile-email">
                {{ userStore.user.email }}
              </td>
            </tr>
            <tr>
              <th scope="row">
                Type
              </th>
              <td>
                <span class="fr-badge fr-mr-1w" :class="AdminLevelWordingBadgeClass[userStore.adminLevel]" data-testid="user-profile-type">
                  {{ AdminLevelWording[userStore.adminLevel] }}
                </span>
              </td>
            </tr>
          </DsfrTable>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profil-container {
  margin-bottom: 10rem;
}
</style>
