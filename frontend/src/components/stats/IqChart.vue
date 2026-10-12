<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed, nextTick } from "vue";
import { Chart, registerables } from "chart.js";
import { storeToRefs } from "pinia";
import { useStatisticsStore } from "@/stores/statisticsStore";
import { renderChart } from "@/utils/chart";
import StatisticsChartTable from "./StatisticsChartTable.vue";
import type { TableColumn } from "@/types/table";
import { toDateInputValue } from "@/composables/use-date";

Chart.register(...registerables);

const chartRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;
let latestRequest = 0;

const statsStore = useStatisticsStore();
const { iqStats, isLoading, error } = storeToRefs(statsStore);

const isTableView = ref(false);
const chartError = ref<string | null>(null);

const tableColumns: TableColumn[] = [
  { field: "date", header: "Date", sortable: true },
  { field: "iq_moyen", header: "IQ moyen", sortable: true },
];

const tableData = computed(() => iqStats.value.map((s) => ({ date: s.label, iq_moyen: s.moyenne })));

const today = new Date();
const fromDefault = new Date(today.getFullYear(), today.getMonth() - 5, 1);
const toDefault = today;

const startDate = ref(toDateInputValue(fromDefault));
const endDate = ref(toDateInputValue(toDefault));
const groupBy = ref<"day" | "week" | "month">("month");
const dateLabel = (value: string) => (/^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split("-").reverse().join("/") : value);
const periodLabel = computed(() => `du ${dateLabel(startDate.value)} au ${dateLabel(endDate.value)}`);
const figureCaption = computed(
  () =>
    `Évolution de l’IQ moyen ${periodLabel.value}. Les dates sont sur l’axe horizontal et l’IQ moyen en pourcentage sur l’axe vertical.`,
);

function updateChart() {
  if (!chartRef.value || !iqStats.value.length) {
    chartInstance?.destroy();
    chartInstance = null;
    return;
  }
  const labels = iqStats.value.map(
    (s) =>
      (groupBy.value === "week" ? "Semaine du " : "") +
      new Date(s.label + (groupBy.value === "month" ? "-01" : "")).toLocaleDateString("fr-FR", {
        day: groupBy.value === "month" ? undefined : "2-digit",
        month: "short",
        year: "numeric",
      }),
  );
  const data = iqStats.value.map((s) => s.moyenne);
  try {
    chartInstance = renderChart(chartRef, chartInstance, labels, data, "line");
  } catch {
    chartInstance = null;
    chartError.value = "Impossible d’afficher le graphique. Les données restent disponibles dans le tableau.";
    isTableView.value = true;
  }
}

async function fetchAndUpdate() {
  const request = ++latestRequest;
  chartError.value = null;
  try {
    await statsStore.fetchIqStats(startDate.value, endDate.value, groupBy.value);
    await nextTick();
    if (request === latestRequest) updateChart();
  } catch {
    if (request === latestRequest) error.value = "Impossible de charger les statistiques IQ pour la période sélectionnée.";
  } finally {
    if (request === latestRequest) isLoading.value = false;
  }
}

watch([groupBy, startDate, endDate], fetchAndUpdate);

onMounted(fetchAndUpdate);
watch(isTableView, async (showTable) => {
  if (!showTable) {
    await nextTick();
    chartInstance?.resize();
  }
});
onBeforeUnmount(() => {
  latestRequest++;
  chartInstance?.destroy();
});
</script>

<template>
  <div class="fr-container-fluid">
    <section aria-labelledby="iq-chart-title">
      <div class="fr-grid-row">
        <div class="fr-col-12">
          <header>
            <h3 id="iq-chart-title">Évolution de l’IQ moyen {{ periodLabel }}</h3>
            <p id="iq-chart-desc">
              Évolution de l’IQ moyen {{ periodLabel }}. L’axe horizontal représente la date, l’axe vertical l’IQ moyen en pourcentage. Le
              bouton « Voir le tableau » donne accès aux mêmes périodes et valeurs.
            </p>
          </header>
        </div>
        <div class="fr-col-12 fr-mb-3w">
          <DsfrButton
            v-if="!chartError"
            :label="isTableView ? 'Voir le graphique' : 'Voir le tableau'"
            data-testid="iq-chart-toggle-view"
            :aria-pressed="isTableView"
            aria-controls="iq-chart-figure iq-chart-data"
            :disabled="isLoading || !!error || !iqStats.length"
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
          <output v-if="isLoading" data-testid="iq-chart-loading" aria-live="polite"> Chargement... </output>
          <div v-else-if="error" data-testid="iq-chart-error" role="alert" aria-live="assertive">
            {{ error }}
          </div>
          <div v-else-if="chartError" data-testid="iq-chart-render-error" role="alert">
            {{ chartError }}
          </div>
          <output v-else-if="!iqStats.length" data-testid="iq-chart-no-data" style="display: block">
            Aucune donnée disponible pour la période sélectionnée.
          </output>
          <figure
            id="iq-chart-figure"
            role="figure"
            :aria-label="figureCaption"
            v-show="!isLoading && !error && !chartError && !isTableView && !!iqStats.length"
          >
            <figcaption class="fr-sr-only">
              {{ figureCaption }}
            </figcaption>
            <canvas
              ref="chartRef"
              role="img"
              aria-labelledby="iq-chart-title"
              data-testid="iq-chart-canvas"
              aria-describedby="iq-chart-desc"
              aria-details="iq-chart-data"
              >Les valeurs sont disponibles en activant le bouton « Voir le tableau ».</canvas
            >
          </figure>
          <div v-show="!isLoading && !error && isTableView && !!iqStats.length" data-testid="iq-chart-table">
            <StatisticsChartTable
              id="iq-chart-data"
              :caption="`IQ moyen ${periodLabel}`"
              :rows="tableData"
              :columns="tableColumns"
              data-testid="iq-chart-datatable"
            />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
