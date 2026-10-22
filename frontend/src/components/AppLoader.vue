<script setup lang="ts">
import { VIcon } from "@gouvminint/vue-dsfr";

// RGAA 7.5 (#3025) : le chargement est restitué aux lecteurs d'écran par une zone role="status"
// portant un texte masqué ; l'icône animée est purement décorative.
withDefaults(defineProps<{ label?: string }>(), { label: "Chargement…" });
</script>

<template>
  <div role="status" data-testid="app-loader">
    <VIcon name="ri-loader-4-line" animation="spin" title="" aria-hidden="true" />
    <span class="fr-sr-only">{{ label }}</span>
  </div>
</template>
