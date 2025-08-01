<script setup lang="ts">
import { toRef } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";
import { priorityRestartLabelsOptions } from "@/composables/use-dictionary";

const searchStore = useApplicationSearchStore();

const selectedPriorities = toRef(searchStore.filters, "priorityRestart");

function togglePriority(value: string, event: Event) {
  const checked = (event.target as HTMLInputElement).checked;
  const current = selectedPriorities.value;

  if (checked && !current.includes(value)) {
    current.push(value);
  } else if (!checked) {
    const index = current.indexOf(value);
    if (index !== -1) {
      current.splice(index, 1);
    }
  }

  searchStore.setFilter("page", 0);
  searchStore.searchApplications();
}
</script>

<template>
  <div>
    <label class="fr-label fr-mb-2w">
      Priorité de redémarrage
      <small v-if="selectedPriorities.length > 0">
        ({{ selectedPriorities.length }} sélectionnée<span v-if="selectedPriorities.length > 1">s</span>)
      </small>
    </label>

    <div>
      <label v-for="option in priorityRestartLabelsOptions" :key="option.value" class="checkbox-item">
        <input
          type="checkbox"
          :value="option.value"
          :checked="selectedPriorities.includes(option.value)"
          @change="(e) => togglePriority(option.value, e)"
        >
        {{ option.text }}
      </label>
    </div>
  </div>
</template>
