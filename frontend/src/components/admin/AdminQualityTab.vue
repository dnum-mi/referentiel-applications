<script setup lang="ts">
const props = defineProps<{ loading: boolean }>();
const emit = defineEmits<(e: "recomputeQuality") => void>();
</script>

<template>
  <div>
    <h1 class="fr-h1">
      Gestion de l'indice de qualité
    </h1>
    <DsfrButton
      :label="props.loading ? 'Mise à jour en cours...' : 'Calculer l’indice de qualité de toutes les applications'"
      :icon="{ name: 'ri-refresh-line', animation: props.loading ? 'spin' : undefined }"
      :disabled="props.loading"
      data-testid="admin-quality-recompute-btn"
      title="Lance le calcul de l'indice de qualité pour toutes les applications"
      aria-label="Calculer l'indice de qualité"
      @click="emit('recomputeQuality')"
    />
  </div>
</template>
