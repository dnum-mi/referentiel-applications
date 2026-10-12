<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch, nextTick } from "vue";
import type { Chart } from "chart.js";
import type { CountByMonthDto } from "@/client/types.gen";
import { useStatisticsStore } from "@/stores/statisticsStore";
import { renderChart } from "@/utils/chart";
import StatisticsChartTable from "./StatisticsChartTable.vue";
import type { TableColumn } from "@/types/table";

const chartRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

const isLoading = ref(false);
const errorMessage = ref("");
const chartErrorMessage = ref("");
const isTableView = ref(false);

const applicationsByMonth = ref<CountByMonthDto[]>([]);

const tableColumns: TableColumn[] = [
  { field: "mois", header: "Mois", sortable: false },
  { field: "total", header: "Nombre d'applications", sortable: false },
];

const tableRows = computed(() =>
  applicationsByMonth.value.map(({ month, total }) => ({
    mois: new Date(month).toLocaleString("fr-FR", { month: "long", year: "numeric" }),
    total,
  })),
);

const statisticsStore = useStatisticsStore();

async function loadData() {
  isLoading.value = true;
  errorMessage.value = "";
  chartErrorMessage.value = "";
  try {
    applicationsByMonth.value = await statisticsStore.countApplicationsByMonth();
  } catch {
    errorMessage.value = "Erreur lors du chargement des données";
  } finally {
    isLoading.value = false;
  }
  if (errorMessage.value) return;
  await nextTick();

  try {
    const labels = applicationsByMonth.value.map((m) => {
      const date = new Date(m.month);
      return date.toLocaleString("fr-FR", { month: "short", year: "numeric" });
    });
    const data = applicationsByMonth.value.map((m) => m.total);

    chartInstance = renderChart(chartRef, chartInstance, labels, data, "bar");
  } catch {
    chartErrorMessage.value = "Impossible d’afficher le graphique. Les données restent disponibles dans le tableau.";
    isTableView.value = true;
  }
}

onMounted(() => {
  loadData();
});
watch(isTableView, async (showTable) => {
  if (!showTable) {
    await nextTick();
    chartInstance?.resize();
  }
});
onBeforeUnmount(() => chartInstance?.destroy());
</script>

<template>
  <section aria-labelledby="applications-chart-title" data-testid="applications-chart">
    <h3 id="applications-chart-title">Nombre d'applications référencées</h3>
    <p id="applications-chart-desc">
      Évolution mensuelle du nombre d’applications référencées. Le bouton « Voir le tableau » donne accès aux mêmes mois et effectifs.
    </p>
    <output v-if="isLoading" data-testid="applications-chart-loading" aria-live="polite"> Chargement... </output>
    <div v-else-if="errorMessage" data-testid="applications-chart-error" role="alert">
      {{ errorMessage }}
    </div>
    <div v-else-if="chartErrorMessage" data-testid="applications-chart-render-error" role="alert">
      {{ chartErrorMessage }}
    </div>
    <dsfr-button
      v-if="!chartErrorMessage"
      :label="isTableView ? 'Voir le graphique' : 'Voir le tableau'"
      class="fr-mb-2v"
      data-testid="applications-chart-toggle-view"
      :aria-pressed="isTableView"
      aria-controls="applications-chart-canvas applications-chart-data"
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
      id="applications-chart-canvas"
      role="img"
      aria-labelledby="applications-chart-title"
      data-testid="applications-chart-canvas"
      aria-describedby="applications-chart-desc"
      aria-details="applications-chart-data"
      >Les valeurs mensuelles sont disponibles en activant le bouton « Voir le tableau ».</canvas
    >
    <StatisticsChartTable
      v-show="!isLoading && !errorMessage && isTableView"
      id="applications-chart-data"
      caption="Nombre d’applications référencées par mois"
      :rows="tableRows"
      :columns="tableColumns"
      data-testid="applications-chart-table"
    />
  </section>
</template>
