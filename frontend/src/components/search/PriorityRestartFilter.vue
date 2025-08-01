<script setup lang="ts">
import { toRef } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";
import { priorityRestartLabelsOptions } from "@/composables/use-dictionary";
import type { ApplicationPriorityRestart } from "@/client/types.gen.js";

const searchStore = useApplicationSearchStore();

const selectedPriorities = toRef(searchStore.filters, "priorityRestart");

function togglePriority(value: ApplicationPriorityRestart, event: Event) {
  const checked = (event.target as HTMLInputElement).checked;

  const selected = new Set<ApplicationPriorityRestart>(searchStore.filters.priorityRestart || []);
  if (checked) {
    selected.add(value);
  } else {
    selected.delete(value);
  }

  searchStore.setFilter("page", 0);
  searchStore.setFilter("priorityRestart", Array.from(selected));
  searchStore.searchApplications();
}
</script>

<template>
  <div>
    <label class="fr-label fr-mb-2w">
      Priorité de redémarrage
      <small v-if="selectedPriorities && selectedPriorities.length > 0">
        ({{ selectedPriorities.length }} sélectionnée<span v-if="selectedPriorities.length > 1">s</span>)
      </small>
    </label>

    <div>
      <label v-for="option in priorityRestartLabelsOptions" :key="option.value" class="checkbox-item">
        <input
          type="checkbox"
          :value="option.value"
          :checked="selectedPriorities?.includes(option.value)"
          @change="(e) => togglePriority(option.value, e)"
        >
        {{ option.text }}
      </label>
    </div>
  </div>
</template>
