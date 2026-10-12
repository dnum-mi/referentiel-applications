<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch, nextTick } from "vue";
import { useStatisticsStore } from "@/stores/statisticsStore";
import type { Chart } from "chart.js";
import type { CountByIqDto } from "@/client/types.gen";
import { renderChart } from "@/utils/chart";
import StatisticsChartTable from "./StatisticsChartTable.vue";
import { iqDistribution } from "@/utils/iq-distribution";
import type { TableColumn } from "@/types/table";

const chartRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

const isLoading = ref(false);
const isTableView = ref(false);
const errorMessage = ref("");
const chartErrorMessage = ref("");
const countApplicationsByIq = ref<CountByIqDto[]>([]);
const distribution = computed(() => iqDistribution(countApplicationsByIq.value));

const tableColumns: TableColumn[] = [
  { field: "iq", header: "Tranche d'IQ", sortable: false },
  { field: "total", header: "Nombre d'applications", sortable: false },
];

const statisticsStore = useStatisticsStore();

async function loadData() {
  isLoading.value = true;
  errorMessage.value = "";
  chartErrorMessage.value = "";
  try {
    countApplicationsByIq.value = await statisticsStore.countApplicationsByIq();
  } catch {
    errorMessage.value = "Erreur lors du chargement des données";
  } finally {
    isLoading.value = false;
  }
  if (errorMessage.value) return;
  await nextTick();

  try {
    const labels = distribution.value.map((row) => row.iq);
    const data = distribution.value.map((row) => row.total);

    chartInstance = renderChart(chartRef, chartInstance, labels, data, "bar");
  } catch {
    chartErrorMessage.value = "Impossible d’afficher le graphique. Les données restent disponibles dans le tableau.";
    isTableView.value = true;
  }
}

onMounted(loadData);
watch(isTableView, async (showTable) => {
  if (!showTable) {
    await nextTick();
    chartInstance?.resize();
  }
});
onBeforeUnmount(() => chartInstance?.destroy());
</script>

<template>
  <section aria-labelledby="applications-iq-title">
    <h3 id="applications-iq-title">Répartition des applications par IQ</h3>
    <output v-if="isLoading" data-testid="applications-iq-chart-loading"> Chargement... </output>
    <div v-else-if="errorMessage" role="alert" data-testid="applications-iq-chart-error">
      {{ errorMessage }}
    </div>
    <div v-else-if="chartErrorMessage" role="alert" data-testid="applications-iq-chart-render-error">
      {{ chartErrorMessage }}
    </div>
    <p id="applications-iq-desc">
      Répartition par tranches de 5 points de l’Indice de Qualité (IQ), arrondi à l’entier le plus proche. Le tableau présente les mêmes
      tranches et effectifs que le graphique.
    </p>
    <dsfr-button
      v-if="!chartErrorMessage"
      :label="isTableView ? 'Voir le graphique' : 'Voir le tableau'"
      class="fr-mb-2v"
      data-testid="applications-iq-chart-toggle-view"
      :aria-pressed="isTableView"
      aria-controls="applications-iq-chart-canvas applications-iq-chart-data"
      :disabled="isLoading || !!errorMessage"
      @click="
        () => {
          isTableView = !isTableView;
        }
      "
    />
    <canvas
      v-show="!isLoading && !errorMessage && !chartErrorMessage && !isTableView"
      ref="chartRef"
      id="applications-iq-chart-canvas"
      role="img"
      aria-labelledby="applications-iq-title"
      data-testid="applications-iq-chart-canvas"
      aria-describedby="applications-iq-desc"
      aria-details="applications-iq-chart-data"
      >Les effectifs par tranche d’IQ sont disponibles en activant le bouton « Voir le tableau ».</canvas
    >
    <StatisticsChartTable
      v-show="!isLoading && !errorMessage && isTableView"
      id="applications-iq-chart-data"
      caption="Répartition des applications par tranche d’IQ arrondi"
      :rows="distribution"
      :columns="tableColumns"
      data-testid="applications-iq-chart-table"
    />
  </section>
</template>
