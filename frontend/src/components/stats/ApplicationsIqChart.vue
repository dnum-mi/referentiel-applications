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

async function loadData() {
  isLoading.value = true;
  try {
    const response = await statisticsStore.countApplicationsByIq();

    const labels = Array.from({ length: 21 }, (_, i) => `${(20 - i) * 5}%`).reverse();
    const data: number[] = Array(21).fill(0);

    response.forEach(({ iq, total }: { iq: number; total: number }) => {
      const index = Math.floor(Math.round(iq) / 5);
      if (index >= 0 && index <= 20) data[index] += total;
    });

    chartInstance = renderChart(chartRef, chartInstance, labels, data, "bar");
  } catch {
    errorMessage.value = "Erreur lors du chargement des données";
  } finally {
    isLoading.value = false;
  }
}

onMounted(loadData);
</script>

<template>
  <h3>Répartition des applications par IQ</h3>
  <div v-if="isLoading">Chargement...</div>
  <div v-else-if="errorMessage">{{ errorMessage }}</div>
  <canvas ref="chartRef" v-show="!isLoading && !errorMessage"></canvas>
</template>
