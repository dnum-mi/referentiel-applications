<script setup lang="ts">
import { useOnboardingTour } from "@/composables/use-onboarding-tour";
import { useOnboardingProgress } from "@/composables/use-onboarding-progress";
import { ONBOARDING_CHAPTERS } from "@/composables/onboarding-chapters";

const { startTour, startChapter } = useOnboardingTour();
const { completedChapters, resetProgress } = useOnboardingProgress();
</script>

<template>
  <details class="onboarding-debug-panel" data-testid="onboarding-debug-panel">
    <summary data-testid="onboarding-debug-toggle">[DEV] Onboarding</summary>
    <div class="onboarding-debug-content">
      <button type="button" data-testid="onboarding-start-full-tour" @click="startTour">▶ Démarrer le tour complet</button>

      <ul>
        <li v-for="chapter in ONBOARDING_CHAPTERS" :key="chapter.id">
          <span :class="{ done: completedChapters.has(chapter.id) }">
            {{ completedChapters.has(chapter.id) ? "✓" : "○" }} {{ chapter.label }}
          </span>
          <button type="button" :data-testid="`onboarding-replay-${chapter.id}`" @click="startChapter(chapter.id)">Rejouer</button>
        </li>
      </ul>

      <button type="button" class="reset" data-testid="onboarding-reset-progress" @click="resetProgress">
        Réinitialiser la progression
      </button>
    </div>
  </details>
</template>

<style scoped>
.onboarding-debug-panel {
  position: fixed;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 3000;
  font-size: 0.75rem;
  background-color: #fff;
  border: 2px solid #e1000f;
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
}

summary {
  color: #e1000f;
  font-weight: bold;
  cursor: pointer;
}

.onboarding-debug-content {
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 16rem;
}

ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.done {
  color: #18753c;
  font-weight: bold;
}

button {
  cursor: pointer;
}

.reset {
  color: #666;
}
</style>
