<script setup lang="ts">
import { useUserStore } from "@/stores/userStore";
import { AdminLevelWording, AdminLevelWordingBadgeClass } from "@/utils/admin-level-utils";

const userStore = useUserStore();
onMounted(() => {
  userStore.fetchUser();
});
</script>

<template>
  <div class="fr-mt-3w fr-mt-md-5w fr-grid-row fr-grid-row--center" data-testid="user-profile">
    <div class="fr-col-12 fr-col-md-8">
      <div v-if="userStore.user" class="fr-card" data-testid="user-profile-card">
        <div class="fr-card__body fr-mt-2w">
          <h2 class="fr-h4" data-testid="user-profile-title">
            Informations personnelles
          </h2>
          <div class="fr-table">
            <table>
              <tbody>
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
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
