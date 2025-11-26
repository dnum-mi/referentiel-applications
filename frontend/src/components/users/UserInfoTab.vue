<script setup lang="ts">
import { useUserStore } from "@/stores/userStore";
import { AdminLevelWording, AdminLevelWordingBadgeClass } from "@/utils/admin-level-utils";

const userStore = useUserStore();
</script>

<template>
  <div v-if="userStore.user" class="fr-mt-3w" data-testid="user-profile-card">
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
          {{ userStore.user.organization?.path || "Non renseignée" }}
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
</template>
