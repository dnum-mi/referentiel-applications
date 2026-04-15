<script setup lang="ts">
defineProps({
  opened: Boolean,
  itemName: String,
});

const emit = defineEmits(["confirm", "cancel"]);

function confirm() {
  emit("confirm");
}

function cancel() {
  emit("cancel");
}
</script>

<template>
  <DsfrModal :opened="opened" title="Confirmation de suppression" size="sm" data-testid="delete-confirmation-modal" @close="cancel">
    <p>Êtes-vous sûr de vouloir supprimer {{ itemName }} ? Cette action est irréversible.</p>
    <div class="actions">
      <DsfrButton type="button" tertiary data-testid="delete-cancel-btn" @click="cancel"> Annuler </DsfrButton>
      <DsfrButton type="button" primary data-testid="delete-confirm-btn" @click="confirm"> Confirmer </DsfrButton>
    </div>
  </DsfrModal>
</template>
