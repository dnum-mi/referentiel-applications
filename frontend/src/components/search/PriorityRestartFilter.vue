<script setup lang="ts">
import { toRef } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";

const searchStore = useApplicationSearchStore();

// 🔁 Accès réactif au tableau dans `filters`
const selectedPriorities = toRef(searchStore.filters, "priorityRestart");

const priorityOptions = [
  { value: "p0", label: "P0 - Critique" },
  { value: "p1", label: "P1 - Haute" },
  { value: "p2", label: "P2 - Moyenne" },
  { value: "p3", label: "P3 - Basse" },
  { value: "p4", label: "P4 - Faible" },
  { value: "p5", label: "P5 - Très faible" },
];

// Gestion d’un clic sur une checkbox
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

  console.log("✅ Nouveau tableau priorities :", [...current]);
  searchStore.searchApplications(); // ou un debounce si tu préfères
}
</script>

<template>
  <div class="filter-section">
    <h6>
      Priorité de redémarrage
      <small v-if="selectedPriorities.length > 0">
        ({{ selectedPriorities.length }} sélectionnée<span v-if="selectedPriorities.length > 1">s</span>)
      </small>
    </h6>

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
.filter-section {
  margin-bottom: 2rem;
}

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
