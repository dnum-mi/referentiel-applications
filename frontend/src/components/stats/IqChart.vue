<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
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
  }
  const labels = iqStats.value.map((s) =>
    new Date(s.label + (groupBy.value === "month" ? "-01" : "")).toLocaleDateString("fr-FR", {
      day: groupBy.value === "day" ? "2-digit" : undefined,
      month: "short",
      year: "numeric",
    }),
  );
  const data = iqStats.value.map((s) => s.moyenne);
  chartInstance = renderChart(chartRef, chartInstance, labels, data, "line");
  isLoading.value = false;
}

async function fetchAndUpdate() {
  await statsStore.fetchIqStats(startDate.value, endDate.value, groupBy.value);
  updateChart();
}

watch(groupBy, fetchAndUpdate);

onMounted(async () => {
  await statsStore.fetchIqStats(undefined, undefined, groupBy.value);
  updateChart();
});
</script>

<template>
  <div class="fr-container-fluid">
    <section aria-labelledby="iq-chart-title">
      <div class="fr-grid-row">
        <div class="fr-col-12">
          <header>
            <h3 id="iq-chart-title">Évolution de l’IQ moyen (6 derniers mois)</h3>
            <p id="iq-chart-desc" class="fr-sr-only">
              Graphique linéaire présentant l’évolution de l’IQ moyen sur la période sélectionnée. L’axe des X représente la date, l’axe des
              Y l’IQ moyen.
            </p>
          </header>
        </div>
        <div class="fr-col-12 fr-mb-3w">
          <DsfrButton
            :label="isTableView ? 'Voir le graphique' : 'Voir le tableau'"
            data-testid="iq-chart-toggle-view"
            @click="
              () => {
                isTableView = !isTableView;
              }
            "
          />
        </div>
        <div class="fr-col-12 fr-mb-4w">
          <div class="fr-grid-row fr-grid-row--gutters">
            <div class="fr-col-12 fr-col-md-4">
              <DsfrInput v-model="startDate" type="date" label="Du" label-visible data-testid="iq-chart-start-date" />
            </div>
            <div class="fr-col-12 fr-col-md-4">
              <DsfrInput v-model="endDate" type="date" label="Au" label-visible data-testid="iq-chart-end-date" />
            </div>
            <div class="fr-col-12 fr-col-md-4">
              <DsfrSelect
                data-testid="iq-chart-groupby-select"
                label="Regrouper par"
                :options="[
                  { value: 'day', text: 'Jour' },
                  { value: 'week', text: 'Semaine' },
                  { value: 'month', text: 'Mois' },
                ]"
                v-model="groupBy"
              />
            </div>
          </div>
        </div>
        <div class="fr-col-12">
          <output v-if="isLoading" data-testid="iq-chart-loading" aria-live="polite" role="status"> Chargement... </output>
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
            <canvas ref="chartRef" data-testid="iq-chart-canvas" role="img" aria-describedby="iq-chart-desc" />
          </figure>
          <div v-show="!isLoading && !error && isTableView" data-testid="iq-chart-table">
            <DsfrDataTable
              :rows="iqStats.map((s) => ({ date: s.label, iq_moyen: s.moyenne }))"
              :headers-row="[
                { key: 'date', label: 'Date' },
                { key: 'iq_moyen', label: 'IQ moyen' },
              ]"
              title="Données tabulaires de l’évolution de l’IQ moyen"
              aria-label="Évolution de l’IQ moyen (tableau)"
              aria-describedby="iq-chart-desc"
              data-testid="iq-chart-datatable"
            />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
