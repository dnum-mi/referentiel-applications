<script setup lang="ts">
import { toRef } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";

const searchStore = useApplicationSearchStore();

const selectedPriorities = toRef(searchStore.filters, "priorityRestart");

const priorityOptions = [
  { value: "p0", label: "P0 - Critique" },
  { value: "p1", label: "P1 - Haute" },
  { value: "p2", label: "P2 - Moyenne" },
  { value: "p3", label: "P3 - Basse" },
  { value: "p4", label: "P4 - Faible" },
  { value: "p5", label: "P5 - Très faible" },
];

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
  <div class="filter-section">
    <p>
      Priorité de redémarrage
      <small v-if="selectedPriorities.length > 0">
        ({{ selectedPriorities.length }} sélectionnée<span v-if="selectedPriorities.length > 1">s</span>)
      </small>
    </p>

    <div class="checkbox-list">
      <label v-for="option in priorityOptions" :key="option.value" class="checkbox-item">
        <input
          type="checkbox"
          :value="option.value"
          :checked="selectedPriorities.includes(option.value)"
          @change="(e) => togglePriority(option.value, e)"
        />
        {{ option.label }}
      </label>
    </div>
  </div>
</template>

<style scoped>
.checkbox-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style>
