<script setup lang="ts">
import { onClickOutside, useToggle } from "@vueuse/core";

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
      <UserPermissions ref="el" />
    </DsfrModal>
  </div>
</template>
