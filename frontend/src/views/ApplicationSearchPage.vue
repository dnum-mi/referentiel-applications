<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useApplicationSearch, type Filters, type TechnicalDebtPoint } from "@/composables/use-application-search";
import { useStatisticsStore } from "@/stores/statisticsStore";
import ApplicationTableView from "@/components/ApplicationTableView.vue";
import ApplicationCardView from "@/components/ApplicationCardView.vue";
import SidebarFilters from "@/components/search/SidebarFilter.vue";
import AppLoader from "@/components/AppLoader.vue";
import ApplicationSearchActions from "@/components/ApplicationSearchActions.vue";
import TechnicalDebtChart from "@/components/technical-debt/TechnicalDebtChart.vue";

const statsStore = useStatisticsStore();
const { isLoading, searchApplications, filters, fetchTechnicalDebtPoints, averageIq, DEFAULT_FILTERS } = useApplicationSearch();

const isMobile = ref(false);
const showChart = ref(false);
const technicalDebtPoints = ref<TechnicalDebtPoint[]>([]);
const isTechnicalDebtLoading = ref(false);

onMounted(() => {
  isMobile.value = window.matchMedia("(max-width: 768px)").matches;
  window.addEventListener("resize", () => {
    isMobile.value = window.matchMedia("(max-width: 768px)").matches;
  });
  statsStore.countApplications();
  searchApplications();
});

const displayMode = computed(() => (isMobile.value ? "tiles" : "table"));

async function loadTechnicalDebtPoints() {
  isTechnicalDebtLoading.value = true;
  try {
    technicalDebtPoints.value = await fetchTechnicalDebtPoints();
  } catch {
    technicalDebtPoints.value = [];
  } finally {
    isTechnicalDebtLoading.value = false;
  }
}

const chartData = computed(() => technicalDebtPoints.value);
const hasChartData = computed(() => chartData.value.length > 0 || isTechnicalDebtLoading.value || showChart.value);

const filterKeysToIgnore = new Set<keyof Filters>(["page", "pageSize", "sortBy", "order"]);

function areArraysEqual(a: unknown[] | undefined, b: unknown[] | undefined) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  const normalize = (values: unknown[]) => values.map(String).slice().sort();
  const normalizedA = normalize(a);
  const normalizedB = normalize(b);
  return normalizedA.every((value, index) => value === normalizedB[index]);
}

const hasActiveFilters = computed(() => {
  const currentFilters = filters.value;

  return Object.entries(DEFAULT_FILTERS).some(([key, defaultValue]) => {
    if (filterKeysToIgnore.has(key as keyof Filters)) return false;
    const currentValue = currentFilters[key as keyof Filters];
    if (Array.isArray(currentValue) || Array.isArray(defaultValue)) {
      return !areArraysEqual(currentValue as unknown[] | undefined, defaultValue as unknown[] | undefined);
    }
    if (currentValue == null || currentValue === "") {
      return defaultValue != null && defaultValue !== "";
    }
    return currentValue !== defaultValue;
  });
});

const averageIqDisplay = computed(() => {
  if (averageIq.value === null) return "-";
  const rounded = Math.round(averageIq.value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
});

watch(
  () => filters.value,
  () => {
    loadTechnicalDebtPoints();
  },
  { deep: true, immediate: true },
);
</script>

<template>
  <div class="layout" data-testid="application-view">
    <SidebarFilters data-testid="application-filters" />

    <main class="main-content" id="main-content" data-testid="main-content" role="main">
      <h1 class="fr-h1" data-testid="application-search-title">Recherche d'applications</h1>

      <div v-if="isLoading" class="loader" data-testid="application-loader" role="status" aria-live="polite" aria-atomic="true">
        <AppLoader />
        <span class="sr-only">Chargement des résultats…</span>
      </div>

      <div class="search-actions-wrapper" data-testid="application-search-actions-wrapper">
        <ApplicationSearchActions :show-chart="showChart" :has-chart-data="hasChartData" @toggle-chart="showChart = !showChart" />
      </div>

      <div class="average-iq" data-testid="application-average-iq">
        <span class="average-iq__label">IQ moyen (Applications Filtrées) : </span>
        <span class="average-iq__value">{{ averageIqDisplay }}</span>
      </div>

      <section v-if="showChart" id="technical-debt-chart" class="chart-section" data-testid="technical-debt-chart-section">
        <div v-if="isTechnicalDebtLoading" class="loader" role="status" aria-live="polite" aria-atomic="true">
          <AppLoader />
          <span class="sr-only">Chargement du graphique…</span>
        </div>
        <TechnicalDebtChart v-else :data="chartData" />
      </section>

      <section id="application-results" class="application-results" aria-live="polite" :aria-busy="isLoading" tabindex="-1">
        <ApplicationTableView v-if="displayMode === 'table'" data-testid="application-table-view" />
        <ApplicationCardView v-else data-testid="application-card-view" />
      </section>
    </main>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  min-height: 100%;
}

.skip-link {
  position: absolute;
  left: -9999px;
  top: auto;
  width: 1px;
  height: 1px;
  overflow: hidden;
  z-index: -9999;
}
.skip-link:focus {
  left: 1rem;
  top: 1rem;
  z-index: 1000;
  width: auto;
  height: auto;
  padding: 0.5rem 0.75rem;
  background: #005ea5;
  color: #fff;
  border-radius: 4px;
  text-decoration: none;
}

@media (max-width: 768px) {
  .layout {
    flex-direction: column;
  }
}

.main-content {
  flex: 1;
  padding: 1rem 2rem;
  overflow-x: auto;
}

.loader {
  display: flex;
  justify-content: center;
  margin-top: 3rem;
}

.search-actions-wrapper {
  margin: 1.25rem 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.average-iq {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin: 0.25rem 0 1.25rem;
}

.average-iq__label {
  color: var(--text-mention-grey);
}

.average-iq__value {
  font-weight: 600;
}

.chart-section {
  margin: 1.5rem 0;
  padding: 1rem;
  background: var(--background-default-grey);
  border-radius: 0.5rem;
}

.application-results {
  margin-top: 0.5rem;
}

.sr-only {
  position: absolute !important;
  height: 1px;
  width: 1px;
  overflow: hidden;
  clip: rect(1px, 1px, 1px, 1px);
  white-space: nowrap;
  border: 0;
  padding: 0;
  margin: -1px;
}
</style>
