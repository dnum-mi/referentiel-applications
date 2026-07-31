<script setup lang="ts">
defineProps<{
  active: boolean;
}>();
</script>

<template>
  <div v-if="active" class="fr-notice fr-notice--warning" role="status" aria-live="polite" data-testid="maintenance-banner">
    <div class="fr-container">
      <div class="fr-notice__body">
        <p class="fr-notice__title">Maintenance en cours</p>
        <p class="fr-notice__desc">
          Le référentiel reste disponible en consultation. Les créations, modifications et suppressions sont temporairement désactivées.
        </p>
      </div>
    </div>
  </div>
</template>
