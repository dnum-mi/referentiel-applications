<script setup lang="ts">
import { ref, onMounted } from "vue";
import { Chart } from "chart.js";
import { useStatisticsStore } from "@/stores/statisticsStore";
import { renderChart } from "@/utils/chart";

const chartRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

const isLoading = ref(false);
const errorMessage = ref("");

const statisticsStore = useStatisticsStore();

async function loadData() {
  isLoading.value = true;
  try {
    const applicationsByMonth = await statisticsStore.countApplicationsByMonth();

    const labels = applicationsByMonth.map((m) => {
      const date = new Date(m.month);
      return date.toLocaleString("fr-FR", { month: "short", year: "numeric" });
    });
    const data = applicationsByMonth.map((m) => m.total);

    chartInstance = renderChart(chartRef, chartInstance, labels, data, "bar");
  } catch {
    errorMessage.value = "Erreur lors du chargement des données";
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <div>
    <h3>Nombre d'applications référencées</h3>
    <div v-if="isLoading">Chargement...</div>
    <div v-else-if="errorMessage">{{ errorMessage }}</div>
    <canvas ref="chartRef" v-show="!isLoading && !errorMessage"></canvas>
  </div>
</template>
