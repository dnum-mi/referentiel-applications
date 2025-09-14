<script setup lang="ts">
import { computed } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";
import { priorityRestartLabelsOptions } from "@/composables/use-dictionary";
import type { ApplicationPriorityRestart } from "@/client/types.gen.js";

const searchStore = useApplicationSearchStore();

const selectedPriorities = computed(() => searchStore.filters.priorityRestart);

function togglePriority(value: ApplicationPriorityRestart, event: Event) {
  const checked = (event.target as HTMLInputElement).checked;

  const selected = new Set<ApplicationPriorityRestart>(searchStore.filters.priorityRestart || []);
  if (checked) {
    selected.add(value);
  } else {
    selected.delete(value);
  }

  searchStore.setFilter({ priorityRestart: Array.from(selected) });
}
</script>

<template>
  <div>
    <legend class="fr-label fr-mb-2w">
      Priorité de redémarrage
    </legend>

    <div data-testid="priority-restart-filter">
      <label v-for="option in priorityRestartLabelsOptions" :key="option.value" class="checkbox-item">
        <input
          type="checkbox"
          :value="option.value"
          :checked="selectedPriorities?.includes(option.value)"
          :data-testid="`priority-restart-option-${option.value}`"
          @change="(e) => togglePriority(option.value, e)"
        >
        {{ option.text }}
      </label>
    </div>
  </div>
</template>
