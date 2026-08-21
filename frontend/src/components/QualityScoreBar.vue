<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  score: number;
  remainingCount: number;
}>();

// Trois paliers (rouge/orange/vert) rendaient tout score sous 80% "alarmant" au premier
// coup d'œil — y compris un 55% qui est en réalité une progression correcte. Un dégradé
// continu (rouge → ambre → vert) évite cet effet de seuil et récompense visuellement
// chaque point gagné, pas seulement le franchissement d'un palier.
const RED: [number, number, number] = [229, 72, 77]; // #e5484d
const AMBER: [number, number, number] = [245, 166, 35]; // #f5a623
const GREEN: [number, number, number] = [48, 164, 108]; // #30a46c

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function mixColor(from: [number, number, number], to: [number, number, number], t: number): string {
  return `rgb(${lerp(from[0], to[0], t)}, ${lerp(from[1], to[1], t)}, ${lerp(from[2], to[2], t)})`;
}

const fillColor = computed(() => {
  const clamped = Math.min(100, Math.max(0, props.score));
  return clamped <= 50 ? mixColor(RED, AMBER, clamped / 50) : mixColor(AMBER, GREEN, (clamped - 50) / 50);
});

const caption = computed(() => {
  if (props.remainingCount === 0) return "Tous les critères pris en compte dans l'indice sont renseignés 🎉";
  if (props.remainingCount === 1) return "Encore 1 action pour progresser — voir « Prochaines actions » ci-dessous.";
  return `Encore ${props.remainingCount} actions pour progresser — voir « Prochaines actions » ci-dessous.`;
});
</script>

<template>
  <div class="quality-score-bar" data-testid="quality-score-bar">
    <div
      class="quality-score-bar-track"
      role="progressbar"
      :aria-valuenow="score"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-label="`Indice de qualité : ${score}%`"
    >
      <div class="quality-score-bar-fill" :style="{ width: `${score}%`, backgroundColor: fillColor }" />
    </div>
    <p class="fr-text--sm quality-score-caption" data-testid="quality-score-caption">{{ caption }}</p>
  </div>
</template>

<style scoped>
.quality-score-bar {
  margin-top: 0.75rem;
  max-width: 24rem;
}

.quality-score-bar-track {
  height: 0.75rem;
  border-radius: 999px;
  background-color: var(--background-contrast-grey);
  overflow: hidden;
}

.quality-score-bar-fill {
  height: 100%;
  border-radius: 999px;
  transition:
    width 0.3s ease,
    background-color 0.3s ease;
}

.quality-score-caption {
  margin: 0.375rem 0 0;
  color: var(--text-mention-grey);
}
</style>
