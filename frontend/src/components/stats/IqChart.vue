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
  if (!chartRef.value || !iqStats.value.length) {
    isLoading.value = false;
    return;
  };
  const labels = iqStats.value.map(s =>
    // Pour 'month', label="YYYY-MM" ; pour 'day'/'week', label="YYYY-MM-DD"
    new Date(s.label + (groupBy.value === "month" ? "-01" : "")).toLocaleDateString("fr-FR", {
      day: groupBy.value === "day" ? "2-digit" : undefined,
      month: "short",
      year: "numeric",
    }),
  );
  const data = iqStats.value.map(s => s.moyenne);

  chartInstance = renderChart(chartRef, chartInstance, labels, data, "line");
  isLoading.value = false;
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

  <fieldset class="fr-fieldset">
    <legend class="fr-fieldset__legend">
      Filtrer les données
    </legend>

    <div class="filters" data-testid="iq-chart-filters">
      <label id="start-date">
        Du
        <input v-model="startDate" type="date" for="start-date" data-testid="iq-chart-start-date" style="color: grey;">
      </label>
      <label id="end-date">
        Au
        <input v-model="endDate" type="date" for="end-date" data-testid="iq-chart-end-date" style="color: grey;">
      </label>

      <div class="buttons" data-testid="iq-chart-buttons">
        <button :class="{ active: groupBy === 'day' }" data-testid="iq-chart-btn-day" @click="applyFilter('day')">
          Jour
        </button>
        <button :class="{ active: groupBy === 'week' }" data-testid="iq-chart-btn-week" @click="applyFilter('week')">
          Semaine
        </button>
        <button :class="{ active: groupBy === 'month' }" data-testid="iq-chart-btn-month" @click="applyFilter('month')">
          Mois
        </button>
      </div>
    </div>
  </fieldset>

  <output v-if="isLoading" data-testid="iq-chart-loading" aria-live="polite" role="status">
    Chargement...
  </output>
  <div v-else-if="error" data-testid="iq-chart-error" role="alert" aria-live="assertive">
    {{ error }}
  </div>
  <div v-else-if="!iqStats.length" data-testid="iq-chart-no-data" role="status">
    Aucune donnée disponible pour la période sélectionnée.
  </div>
  <figure v-show="!isLoading && !error" focus-visible>
    <figcaption class="fr-sr-only">
      Graphique linéaire représentant l’évolution de l’IQ moyen, avec l’axe des X pour la date et l’axe des Y pour l’IQ moyen.
    </figcaption>
    <canvas ref="chartRef" data-testid="iq-chart-canvas" role="img" />
    <DsfrDataTable
      :rows="iqStats.map(s => ({ date: s.label, iq_moyen: s.moyenne }))"
      :headers-row="[
        { key: 'date', label: 'Date', sortable: false },
        { key: 'iq_moyen', label: 'IQ moyen', sortable: false },
      ]"
      title="Données tabulaires de l’évolution de l’IQ moyen"
      class="fr-sr-only"
      data-testid="iq-chart-datatable"
    />
  </figure>
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
