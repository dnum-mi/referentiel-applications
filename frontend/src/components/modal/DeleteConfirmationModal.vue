<script setup lang="ts">
import { nextTick, watch } from "vue";
import { useSubmissionFocus } from "@/composables/use-submission-focus";

const props = defineProps({
  opened: Boolean,
  itemName: String,
  errorMessage: { type: String, default: "" },
  isSubmitting: Boolean,
});

const emit = defineEmits(["confirm", "cancel"]);
useSubmissionFocus(() => props.isSubmitting);

// 12.8 : à l'ouverture, porter le focus sur le premier élément interactif de la modale (bouton « Fermer »).
watch(
  () => props.opened,
  async (isOpen) => {
    if (!isOpen) return;
    await nextTick();
    document.querySelector<HTMLButtonElement>('[data-testid="delete-confirmation-modal"] .fr-btn--close')?.focus();
  },
);

function confirm() {
  if (props.isSubmitting) return;
  emit("confirm");
}

function cancel() {
  emit("cancel");
}
</script>

<template>
  <DsfrModal :opened="opened" title="Confirmation de suppression" size="sm" data-testid="delete-confirmation-modal" @close="cancel">
    <p>Êtes-vous sûr de vouloir supprimer {{ itemName }} ? Cette action est irréversible.</p>
    <div role="alert" aria-live="assertive" aria-atomic="true" data-testid="delete-confirmation-error">
      <p v-if="errorMessage" class="fr-error-text">{{ errorMessage }}</p>
    </div>
    <div class="actions">
      <DsfrButton type="button" tertiary data-testid="delete-cancel-btn" @click="cancel"> Annuler </DsfrButton>
      <DsfrButton type="button" primary :aria-disabled="isSubmitting" data-testid="delete-confirm-btn" @click="confirm">
        Confirmer
      </DsfrButton>
    </div>
  </DsfrModal>
</template>
