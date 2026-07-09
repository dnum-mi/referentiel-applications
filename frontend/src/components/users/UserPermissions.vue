<script setup lang="ts">
import type { UserWithPermissions } from "@/client";
import { RolesWording, RolesWordingBadgeClass } from "@/utils/roles-utils";
import { computed } from "vue";

const props = defineProps<{ user: UserWithPermissions }>();
const user = toRef(props, "user");

const userPermissions = computed(() => user.value.permissions ?? []);
const userAdditionalPermissions = computed(() => user.value.additionalPermissions ?? []);
const scopePermission = computed(() => user.value.scopeOrganization?.path ?? "Tout");
</script>

<template>
  <div class="fr-mb-4w">
    <div class="fr-mb-3w">
      <p class="fr-text--sm fr-text--bold fr-mb-1w">Rôle</p>
      <p>
        <span class="fr-badge fr-mr-1w" :class="RolesWordingBadgeClass[user.role]">
          {{ RolesWording[user.role] }}
        </span>
      </p>
    </div>
    <UserPermissionList :permissions="userPermissions" :label="`Permissions accordées par le rôle sur ${scopePermission}`" />
    <UserPermissionList :permissions="userAdditionalPermissions" label="Permissions supplémentaires" />
  </div>
</template>
