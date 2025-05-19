<script setup lang="ts">
import { toRef } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";

const searchStore = useApplicationSearchStore();

const selectedPriorities = toRef(searchStore.filters, "priorityRestart");

const priorityOptions = [
  { value: "R0", label: "R0 - Immédiat (H24)" },
  { value: "R1", label: "R1 - Dès que le socle technique est rétabli (H24)" },
  { value: "R1_STAR", label: "R1* - Selon période d'activité" },
  { value: "R2", label: "R2 - Dès que possible (H24)" },
  { value: "R3", label: "R3 - Quand le plus urgent est réalisé (H0)" },
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
