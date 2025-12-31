<script lang="ts" setup>
defineProps<{
  offlineReady?: boolean;
  needRefresh?: boolean;
}>();

defineEmits<EventTypes>();

interface EventTypes {
  (event: "close"): void;
  (event: "updateServiceWorker"): void;
}
</script>

<template>
  <div v-if="offlineReady || needRefresh" role="alert" class="new-content-wrapper" data-testid="reload-prompt">
    <div class="mb-2">
      <span v-if="offlineReady" data-testid="reload-offline-msg"> App prête pour le hors-ligne </span>
      <span v-else data-testid="reload-refresh-msg"> Nouveau contenu disponible, cliquer sur "Recharger" pour mettre à jour. </span>
    </div>

    <div class="actions">
      <DsfrButton
        v-if="needRefresh"
        class="button"
        icon="ri-refresh-line"
        icon-right
        data-testid="reload-refresh-btn"
        title="Recharger l'application pour mettre à jour"
        aria-label="Recharger l'application"
        @click="$emit('updateServiceWorker')"
      >
        Recharger
      </DsfrButton>
      <DsfrButton
        class="button"
        icon="ri-close-line"
        icon-right
        secondary
        data-testid="reload-close-btn"
        title="Fermer cette notification"
        aria-label="Fermer"
        @click="$emit('close')"
      >
        Fermer
      </DsfrButton>
    </div>
  </div>
</template>

<style scoped>
.new-content-wrapper {
  position: fixed;
  right: 0;
  bottom: 0;
  margin: 1rem;
  padding: 1rem;
  border: 1px solid #aaa;
  z-index: 1;
  border-radius: 5px;
  box-shadow:
    0 4px 6px -1px rgb(0 0 0 / 0.1),
    0 2px 4px -2px rgb(0 0 0 / 0.1);
}

.mb-2 {
  margin-bottom: 1rem;
}

.actions {
  display: flex;
  flex-direction: row-reverse;
  gap: 0.5rem;
}
</style>
