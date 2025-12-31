<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import type { Chart } from "chart.js";
import { useStatisticsStore } from "@/stores/statisticsStore";
import { renderChart } from "@/utils/chart";

const chartRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

const isLoading = ref(false);
const errorMessage = ref("");
const isTableView = ref(false);

const applicationsByMonth = ref<{ month: string; total: number }[]>([]);

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
    <output v-if="isLoading" data-testid="applications-chart-loading" aria-live="polite" role="status"> Chargement... </output>
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
      role="img"
      aria-describedby="applications-chart-desc"
    />
    <DsfrDataTable
      v-show="!isLoading && !errorMessage && isTableView"
      :rows="tableRows"
      :headers-row="[
        { key: 'mois', label: 'Mois', sortable: false },
        { key: 'total', label: 'Nombre d\'applications', sortable: false },
      ]"
      :sortable-rows="false"
      row-key="mois"
      aria-label="Nombre d'applications référencées par mois (tableau)"
      aria-describedby="applications-chart-desc"
      data-testid="applications-chart-table"
    />
  </section>
</template>
