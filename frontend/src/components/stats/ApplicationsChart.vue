<script setup lang="ts">
import { ref, onMounted } from "vue";
import Applications from "@/api/application";
import { Chart, BarController, BarElement, CategoryScale, LinearScale } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";

Chart.register(BarController, BarElement, CategoryScale, LinearScale, ChartDataLabels);

const chartRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

const labels = ref<string[]>([]);
const data = ref<number[]>([]);
const isLoading = ref(false);
const errorMessage = ref("");

async function loadData() {
  isLoading.value = true;
  try {
    const applicationsByMonth = await Applications.countApplicationsByMonth();

    labels.value = applicationsByMonth.map((m) => {
      const date = new Date(m.month);
      return date.toLocaleString("fr-FR", { month: "short", year: "numeric" });
    });
    data.value = applicationsByMonth.map((m) => m.total);

    renderChart();
  } catch (e) {
    errorMessage.value = "Erreur lors du chargement des données";
  } finally {
    isLoading.value = false;
  }
}

function renderChart() {
  if (!chartRef.value) return;

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(chartRef.value, {
    type: "bar",
    data: {
      labels: labels.value,
      datasets: [
        {
          data: data.value,
          backgroundColor: "#3e95cd",
        },
      ],
    },
    options: {
      responsive: true,
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  });
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
    <canvas ref="chartRef"></canvas>
  </div>
</template>
