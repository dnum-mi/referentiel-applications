<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import type { Chart } from "chart.js";
import { useStatisticsStore } from "@/stores/statisticsStore";
import { renderChart } from "@/utils/chart";
import RefAppTable from "@/components/RefAppTable.vue";
import type { TableColumn } from "@/types/table";

const chartRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

const isLoading = ref(false);
const errorMessage = ref("");
const isTableView = ref(false);

const applicationsByMonth = ref<{ month: string; total: number }[]>([]);

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
  try {
    applicationsByMonth.value = await statisticsStore.countApplicationsByMonth();

    const labels = applicationsByMonth.value.map((m) => {
      const date = new Date(m.month);
      return date.toLocaleString("fr-FR", { month: "short", year: "numeric" });
    });
    const data = applicationsByMonth.value.map((m) => m.total);

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
  <section aria-labelledby="applications-chart-title" data-testid="applications-chart">
    <h3 id="applications-chart-title">Nombre d'applications référencées</h3>
    <p id="applications-chart-desc" class="fr-sr-only">Ce graphique présente l’évolution mensuelle du nombre d’applications référencées.</p>
    <output v-if="isLoading" data-testid="applications-chart-loading" aria-live="polite"> Chargement... </output>
    <div v-else-if="errorMessage" data-testid="applications-chart-error" role="alert">
      {{ errorMessage }}
    </div>
    <dsfr-button
      :label="isTableView ? 'Voir le graphique' : 'Voir le tableau'"
      class="fr-mb-2v"
      data-testid="applications-chart-toggle-view"
      @click="
        () => {
          isTableView = !isTableView;
        }
      "
    />
    <canvas
      v-show="!isLoading && !errorMessage && !isTableView"
      ref="chartRef"
      data-testid="applications-chart-canvas"
      aria-describedby="applications-chart-desc"
    />
    <RefAppTable
      v-show="!isLoading && !errorMessage && isTableView"
      :items="tableRows"
      :columns="tableColumns"
      data-testid="applications-chart-table"
    />
  </section>
</template>
