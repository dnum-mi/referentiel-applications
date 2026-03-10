<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useApplicationSearch, type TechnicalDebtPoint } from "@/composables/use-application-search";
import SidebarFilters from "@/components/search/SidebarFilter.vue";
import AppLoader from "@/components/AppLoader.vue";
import TechnicalDebtChart from "@/components/technical-debt/TechnicalDebtChart.vue";
import { watchDebounced } from "@vueuse/core";

const { filters, fetchTechnicalDebtPoints } = useApplicationSearch();

const technicalDebtPoints = ref<TechnicalDebtPoint[]>([]);
const isTechnicalDebtLoading = ref(false);

onMounted(() => {
  loadTechnicalDebtPoints();
});

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

watchDebounced(
  () => filters.value,
  () => {
    loadTechnicalDebtPoints();
  },
  { deep: true, debounce: 300 },
);
</script>

<template>
  <div class="layout" data-testid="time-view">
    <SidebarFilters data-testid="time-filters" />

    <main class="main-content" id="main-content" data-testid="main-content" role="main">
      <h1 class="fr-h1" data-testid="time-title">Diagramme Time</h1>

      <section id="technical-debt-chart" class="chart-section" data-testid="technical-debt-chart-section">
        <div v-if="isTechnicalDebtLoading" class="loader" role="status" aria-live="polite" aria-atomic="true">
          <AppLoader />
          <span class="sr-only">Chargement du graphique…</span>
        </div>
        <TechnicalDebtChart v-else :data="technicalDebtPoints" />
      </section>
    </main>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  min-height: 100%;
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

.chart-section {
  margin: 1.5rem 0;
  padding: 1rem;
  background: var(--background-default-grey);
  border-radius: 0.5rem;
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
