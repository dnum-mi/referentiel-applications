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

const isTableView = ref(false);

const today = new Date();
const fromDefault = new Date(today.getFullYear(), today.getMonth() - 5, 1);
const toDefault = today;

const startDate = ref(fromDefault.toISOString().slice(0, 10));
const endDate = ref(toDefault.toISOString().slice(0, 10));

const groupBy = ref<"day" | "week" | "month">("month");

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

async function applyFilter(by: "day" | "week" | "month") {
  groupBy.value = by;
  await statsStore.fetchIqStats(startDate.value, endDate.value, by);
  updateChart();
}

onMounted(async () => {
  await statsStore.fetchIqStats(undefined, undefined, "month");
  updateChart();
});
</script>

<template>
  <section aria-labelledby="iq-chart-title">
    <h3 id="iq-chart-title">Évolution de l’IQ moyen (6 derniers mois)</h3>
    <p id="iq-chart-desc" class="fr-sr-only">
      Graphique linéaire présentant l’évolution de l’IQ moyen sur la période sélectionnée. L’axe des X représente la date, l’axe des Y l’IQ moyen.
    </p>

    <fieldset class="fr-fieldset">
      <legend class="fr-fieldset__legend">
        Filtrer les données
      </legend>
      
      <DsfrButton
        :label="isTableView ? 'Voir le graphique' : 'Voir le tableau'"
        data-testid="iq-chart-toggle-view"
        @click="() => { isTableView = !isTableView }"
      />

      <div class="filters" data-testid="iq-chart-filters" >
        <label id="start-date">
          Du
          <input v-model="startDate" type="date" for="start-date" data-testid="iq-chart-start-date" style="color: grey;">
        </label>
        <label id="end-date">
          Au
          <input v-model="endDate" type="date" for="end-date" data-testid="iq-chart-end-date" style="color: grey;">
        </label>

        <DsfrButtonGroup data-testid="iq-chart-buttons" class="buttons">
          <DsfrButton :class="{ active: groupBy === 'day' }" data-testid="iq-chart-btn-day" @click="applyFilter('day')" label="Jour"/>
          <DsfrButton :class="{ active: groupBy === 'week' }" data-testid="iq-chart-btn-week" @click="applyFilter('week')" label="Semaine" />
          <DsfrButton :class="{ active: groupBy === 'month' }" data-testid="iq-chart-btn-month" @click="applyFilter('month')" label="Mois" />
        </DsfrButtonGroup>
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
  <figure v-show="!isLoading && !error && !isTableView" focus-visible>
    <figcaption class="fr-sr-only">
      Graphique linéaire représentant l’évolution de l’IQ moyen, avec l’axe des X pour la date et l’axe des Y pour l’IQ moyen.
    </figcaption>
    <canvas
      ref="chartRef"
      data-testid="iq-chart-canvas"
      role="img"
      aria-describedby="iq-chart-desc"
    />
  </figure>
  <div v-show="!isLoading && !error && isTableView" data-testid="iq-chart-table">
    <DsfrDataTable
      :rows="iqStats.map(s => ({ date: s.label, iq_moyen: s.moyenne }))"
      :headers-row="[
        { key: 'date', label: 'Date', sortable: false },
        { key: 'iq_moyen', label: 'IQ moyen', sortable: false },
      ]"
      title="Données tabulaires de l’évolution de l’IQ moyen"
      aria-label="Évolution de l’IQ moyen (tableau)"
      aria-describedby="iq-chart-desc"
      data-testid="iq-chart-datatable"
    />
  </div>
  </section>
</template>

<style scoped>
.filters {
  display: inline-flex;
  flex-wrap: nowrap;
  align-items: center;
  margin-bottom: 1rem;
}
.buttons {
  display: inline-flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.1rem;
  margin-left: 1rem;
}

button.active {
  background: var(--background-action-high-blue-france);
  color: white;
}
canvas {
  width: 100% !important;
  height: 320px !important;
}
</style>
