<script setup lang="ts">
import { useApplicationSearch } from "@/composables/use-application-search";
import { priorityRestartLabelsOptions } from "@/composables/use-dictionary";
import type { ApplicationPriorityRestart } from "@/client/types.gen.js";

const { filters, setFilter } = useApplicationSearch();

function togglePriority(value: ApplicationPriorityRestart, checked: boolean) {
  const selected = new Set<ApplicationPriorityRestart>(filters.value.priorityRestart || []);
  checked ? selected.add(value) : selected.delete(value);
  setFilter({ priorityRestart: Array.from(selected) });
}
</script>

<template>
  <div>
    <legend class="fr-label fr-mb-2w">Priorité de redémarrage</legend>
    <div data-testid="priority-restart-filter">
      <label v-for="option in priorityRestartLabelsOptions" :key="option.value" class="checkbox-item">
        <input
          type="checkbox"
          :value="option.value"
          :checked="filters.priorityRestart?.includes(option.value)"
          :data-testid="`priority-restart-option-${option.value}`"
          @change="(e) => togglePriority(option.value, (e.target as HTMLInputElement).checked)"
        >
        {{ option.text }}
      </label>
    </div>
  </div>
</template>
