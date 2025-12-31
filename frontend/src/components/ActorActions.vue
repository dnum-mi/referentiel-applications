<script setup lang="ts">
defineProps({
  actor: {
    type: Object,
    required: true,
  },
});
const emit = defineEmits(["edit", "delete"]);

function onEdit() {
  emit("edit");
}
function onDelete() {
  emit("delete");
}
</script>

<template>
  <div class="action-buttons">
    <DsfrButton icon="ri-pencil-line" data-testid="actor-edit-action" title="Éditer l'acteur" aria-label="Éditer l'acteur" @click="onEdit">
      Éditer
    </DsfrButton>
    <DsfrButton
      icon="ri-delete-bin-line"
      data-testid="actor-delete-action"
      title="Supprimer l'acteur"
      aria-label="Supprimer l'acteur"
      @click="onDelete"
    >
      Supprimer
    </DsfrButton>
  </div>
</template>

<style scoped>
.action-buttons {
  display: flex;
  gap: 0.5rem;
}
</style>
