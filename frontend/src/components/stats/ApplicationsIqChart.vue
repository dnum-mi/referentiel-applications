<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useStatisticsStore } from "@/stores/statisticsStore";
import type { Chart } from "chart.js";
import type { CountByIqDto } from "@/client/types.gen";
import { renderChart } from "@/utils/chart";
import RefAppTable from "@/components/RefAppTable.vue";
import type { TableColumn } from "@/types/table";

const chartRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

const isLoading = ref(false);
const isTableView = ref(false);
const errorMessage = ref("");
const countApplicationsByIq = ref<CountByIqDto[]>([]);

const tableColumns: TableColumn[] = [
  { field: "iq", header: "Tranche d'IQ", sortable: false },
  { field: "total", header: "Nombre d'applications", sortable: false },
];

const statisticsStore = useStatisticsStore();

async function loadData() {
  isLoading.value = true;
  try {
    countApplicationsByIq.value = await statisticsStore.countApplicationsByIq();

    const labels = Array.from({ length: 21 }, (_, i) => `${(20 - i) * 5}%`).reverse();
    const data: number[] = Array.from({ length: 21 }, () => 0);

    countApplicationsByIq.value.forEach(({ iq, total }) => {
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
  <section aria-labelledby="applications-iq-title">
    <h3 id="applications-iq-title">Répartition des applications par IQ</h3>
    <output v-if="isLoading" data-testid="applications-iq-chart-loading"> Chargement... </output>
    <div v-else-if="errorMessage" role="alert" data-testid="applications-iq-chart-error">
      {{ errorMessage }}
    </div>
    <p id="applications-iq-desc" class="fr-sr-only">
      Ce graphique présente la répartition par tranches de 5% de l'Indice de Qualité (IQ) des applications.
    </p>
    <dsfr-button
      :label="isTableView ? 'Voir le graphique' : 'Voir le tableau'"
      class="fr-mb-2v"
      data-testid="applications-iq-chart-toggle-view"
      @click="
        () => {
          isTableView = !isTableView;
        }
      "
    />
    <canvas
      v-show="!isLoading && !errorMessage && !isTableView"
      ref="chartRef"
      data-testid="applications-iq-chart-canvas"
      aria-describedby="applications-iq-desc"
    />
    <RefAppTable
      v-show="!isLoading && !errorMessage && isTableView"
      :items="countApplicationsByIq"
      :columns="tableColumns"
      data-testid="applications-iq-chart-table"
    />
  </section>
</template>
