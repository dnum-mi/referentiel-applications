<script setup lang="ts">
import { onClickOutside, useToggle } from "@vueuse/core";

const [value, toggle] = useToggle(false);
const modalEl = ref<HTMLInputElement | null>(null);

onClickOutside(modalEl, () => {
  toggle(false);
});
</script>

<template>
  <div>
    <DsfrButton
      label="Voir"
      ref="modalEl"
      size="sm"
      secondary
      data-testid="admin-user-permissions-btn"
      title="Voir les permissions de l'utilisateur"
      aria-label="Voir les permissions de l'utilisateur"
      @click="toggle()"
    />
    <DsfrModal :opened="value" size="lg" title="Permissions de l'utilisateur" data-testid="admin-edit-user-modal" @close="toggle(false)">
      <UserPermissions />
    </DsfrModal>
  </div>
</template>
