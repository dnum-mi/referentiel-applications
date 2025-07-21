<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useStatisticsStore } from "@/stores/statisticsStore";
import { Chart } from "chart.js";
import { renderChart } from "@/utils/chart";

const chartRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

const isLoading = ref(false);
const errorMessage = ref("");

const statisticsStore = useStatisticsStore();

async function loadMonthlyIqStats() {
  isLoading.value = true;
  try {
    await statisticsStore.fetchMonthlyIqStats();

    const labels = statisticsStore.iqMonthlyStats.map((s) =>
      new Date(s.date).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })
    );

    const data = statisticsStore.iqMonthlyStats.map((s) => s.valeur);

    chartInstance = renderChart(chartRef, chartInstance, labels, data, "line");
  } catch (err) {
    errorMessage.value = "Erreur lors du chargement des statistiques IQ";
  } finally {
    isLoading.value = false;
  }
}

onMounted(loadMonthlyIqStats);
</script>

<template>
  <h3>Évolution mensuelle de la qualité IQ moyenne</h3>
  <div v-if="isLoading">Chargement...</div>
  <div v-else-if="errorMessage">{{ errorMessage }}</div>
  <canvas ref="chartRef" v-show="!isLoading && !errorMessage"></canvas>
</template>