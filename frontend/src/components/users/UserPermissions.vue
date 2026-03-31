<script setup lang="ts">
import type { UserWithPermissions } from "@/client";
import { useUserStore } from "@/stores/userStore";
import { RolesWording, RolesWordingBadgeClass } from "@/utils/roles-utils";
import { computed } from "vue";

const props = defineProps<{ user: UserWithPermissions }>();
const user = toRef(props, "user");

const userPermissions = computed(() => user.value.permissions ?? []);
const userAdditionalPermissions = computed(() => user.value.additionalPermissions ?? []);
</script>

<template>
  <div class="fr-mb-4w">
    <div class="fr-mb-3w">
      <p class="fr-text--sm fr-text--bold fr-mb-1w">Rôle</p>
      <span class="fr-badge fr-mr-1w" :class="RolesWordingBadgeClass[user.role]">
        {{ RolesWording[user.role] }}
      </span>
    </div>
    <UserPermissionList :permissions="userPermissions" label="Permissions accordées par le rôle" />
    <UserPermissionList :permissions="userAdditionalPermissions" label="Permissions supplémentaires" />
  </div>
</template>
