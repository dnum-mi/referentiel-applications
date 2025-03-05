<script setup lang="ts">
import { defineProps, defineEmits } from "vue";

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
  <DsfrModal :opened="opened" :title="`Confirmation de suppression`" size="sm" @close="cancel">
    <p>Êtes-vous sûr de vouloir supprimer les {{ itemName }} sélectionnés ? Cette action est irréversible.</p>
    <div class="actions">
      <DsfrButton type="button" @click="cancel" tertiary>Annuler</DsfrButton>
      <DsfrButton type="button" @click="confirm" primary>Confirmer</DsfrButton>
    </div>
  </DsfrModal>
</template>
