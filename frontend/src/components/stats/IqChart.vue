<script setup lang="ts">
import { ref, onMounted } from "vue";
import { Chart, registerables } from "chart.js";
import { storeToRefs } from "pinia";
import { useStatisticsStore } from "@/stores/statisticsStore";
import { renderChart } from "@/utils/chart";

Chart.register(...registerables);

const chartRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

const statsStore = useStatisticsStore();
const { iqStats, isLoading, error } = storeToRefs(statsStore);

// Par défaut, 6 derniers mois
const today = new Date();
const fromDefault = new Date(today.getFullYear(), today.getMonth() - 5, 1);
const toDefault = today;

const startDate = ref(fromDefault.toISOString().slice(0, 10));
const endDate = ref(toDefault.toISOString().slice(0, 10));

// État du groupement courant
const groupBy = ref<"day" | "week" | "month">("month");

/** (Re)dessine le chart */
function updateChart() {
  if (!chartRef.value || !iqStats.value.length) return;
  const labels = iqStats.value.map((s) =>
    // Pour 'month', label="YYYY-MM" ; pour 'day'/'week', label="YYYY-MM-DD"
    new Date(s.label + (groupBy.value === "month" ? "-01" : "")).toLocaleDateString("fr-FR", {
      day: groupBy.value === "day" ? "2-digit" : undefined,
      month: "short",
      year: "numeric",
    }),
  );
  const data = iqStats.value.map((s) => s.moyenne);

  chartInstance = renderChart(chartRef, chartInstance, labels, data, "line");
}

/** Appelle l’API avec la plage et le groupBy choisis */
async function applyFilter(by: "day" | "week" | "month") {
  groupBy.value = by;
  await statsStore.fetchIqStats(startDate.value, endDate.value, by);
  updateChart();
}

// Au montage, on récupère la vue par défaut (6 mois, groupBy=month)
onMounted(async () => {
  await statsStore.fetchIqStats(undefined, undefined, "month");
  updateChart();
});
</script>

<template>
  <h3>Évolution de l’IQ moyen (6 derniers mois)</h3>

  <div class="filters">
    <label>
      Du
      <input type="date" v-model="startDate" />
    </label>
    <label>
      Au
      <input type="date" v-model="endDate" />
    </label>

    <div class="buttons">
      <button :class="{ active: groupBy === 'day' }" @click="applyFilter('day')">Jour</button>
      <button :class="{ active: groupBy === 'week' }" @click="applyFilter('week')">Semaine</button>
      <button :class="{ active: groupBy === 'month' }" @click="applyFilter('month')">Mois</button>
    </div>
  </div>

  <div v-if="isLoading">Chargement...</div>
  <div v-else-if="error">{{ error }}</div>
  <canvas ref="chartRef" v-else></canvas>
</template>

<style scoped>
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
}
.buttons {
  display: flex;
  gap: 0.5rem;
}
button {
  padding: 0.4rem 0.8rem;
  background: #eee;
  border: none;
  cursor: pointer;
}
button.active {
  background: #007bff;
  color: white;
}
canvas {
  width: 100% !important;
  height: 320px !important;
}
</style>
