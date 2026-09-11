<script setup lang="ts">
import type { UserWithPermissions } from "@/client";
import { RolesWording, RolesWordingBadgeClass } from "@/utils/roles-utils";
import { computed } from "vue";

const props = defineProps<{ user: UserWithPermissions }>();
const user = toRef(props, "user");

const userPermissions = computed(() => user.value.permissions ?? []);
const userAdditionalPermissions = computed(() => user.value.additionalPermissions ?? []);
const scopePermission = computed(() => user.value.scopeOrganization?.path ?? "Tout");
// #1985 : session rétrogradée (renseigné seulement pour l'utilisateur courant, via /users/me).
// Le rôle affiché est le rôle EFFECTIF de la session ; le rôle d'origine n'est jamais exposé.
const isDowngraded = computed(() => user.value.authLevel?.downgraded === true);
const rolePermissionsLabel = computed(() =>
  isDowngraded.value
    ? "Permissions effectives (session sans authentification forte)"
    : `Permissions accordées par le rôle sur ${scopePermission.value}`,
);
</script>

<template>
  <div class="fr-mb-4w">
    <div class="fr-mb-3w">
      <p class="fr-text--sm fr-text--bold fr-mb-1w">Rôle</p>
      <p>
        <span class="fr-badge fr-mr-1w" :class="RolesWordingBadgeClass[user.role]">
          {{ RolesWording[user.role] }}
        </span>
        <span v-if="isDowngraded" class="fr-badge fr-badge--warning fr-badge--sm" data-testid="user-permissions-downgraded-badge">
          Droits limités (authentification faible)
        </span>
      </p>
    </div>
    <UserPermissionList :permissions="userPermissions" :label="rolePermissionsLabel" />
    <UserPermissionList :permissions="userAdditionalPermissions" label="Permissions supplémentaires" />
  </div>
</template>
