<script setup lang="ts">
import { useUserStore } from "@/stores/userStore";
import { AdminLevelWording, AdminLevelWordingBadgeClass } from "@/utils/admin-level-utils";

const userStore = useUserStore();
</script>

<template>
  <div class="fr-grid-row fr-grid-row--center">
    <div class="fr-col-12 fr-col-md-8">
      <div v-if="userStore.user" class="fr-card">
        <div class="fr-card__body fr-mt-2w">
          <h2 class="fr-h4">
            Informations personnelles
          </h2>
          <div class="fr-table">
            <table>
              <tbody>
                <tr>
                  <th scope="row">
                    ID Keycloak
                  </th>
                  <td>{{ userStore.user.keycloakId }}</td>
                </tr>
                <tr>
                  <th scope="row">
                    Email
                  </th>
                  <td>{{ userStore.user.email }}</td>
                </tr>
                <tr>
                  <th scope="row">
                    Type
                  </th>
                  <td>
                    <span class="fr-badge fr-mr-1w" :class="AdminLevelWordingBadgeClass[userStore.adminLevel]">
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
