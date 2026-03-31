<script setup lang="ts">
import type { UserWithPermissions } from "@/client";
import { onClickOutside, useToggle } from "@vueuse/core";

const props = defineProps<{ user: UserWithPermissions }>();
const [value, toggle] = useToggle(false);
const el = ref<HTMLElement | null>(null);

onClickOutside(el, () => {
  toggle(false);
});
</script>

<template>
  <div>
    <DsfrButton
      label="Voir"
      size="sm"
      secondary
      data-testid="admin-user-permissions-btn"
      title="Voir les permissions de l'utilisateur"
      aria-label="Voir les permissions de l'utilisateur"
      @click="toggle()"
    />
    <DsfrModal :opened="value" size="lg" title="Permissions de l'utilisateur" data-testid="admin-edit-user-modal" @close="toggle(false)">
      <UserPermissions ref="el" :user="props.user" />
    </DsfrModal>
  </div>
</template>
