<script setup lang="ts">
import { useUserStore } from "@/stores/userStore";
import { RolesWording, RolesWordingBadgeClass } from "@/utils/roles-utils";
import { computed } from "vue";

const userStore = useUserStore();

const userPermissions = computed(() => userStore.user?.permissions ?? []);
const userAdditionalPermissions = computed(() => userStore.user?.additionalPermissions ?? []);
</script>

<template>
  <div class="fr-mb-4w">
    <div class="fr-mb-3w">
      <p class="fr-text--sm fr-text--bold fr-mb-1w">Rôle</p>
      <span class="fr-badge fr-mr-1w" :class="RolesWordingBadgeClass[userStore.userRole]">
        {{ RolesWording[userStore.userRole] }}
      </span>
    </div>
    <UserPermissionList :permissions="userPermissions" label="Permissions accordées par le rôle" />
    <UserPermissionList :permissions="userAdditionalPermissions" label="Permissions supplémentaires" />
  </div>
</template>
