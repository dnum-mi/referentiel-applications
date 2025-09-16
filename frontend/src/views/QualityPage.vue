<script setup lang="ts">
import ApplicationsChart from "@/components/stats/ApplicationsChart.vue";
import ApplicationsIqChart from "@/components/stats/ApplicationsIqChart.vue";
import GlobalStats from "@/components/stats/GlobalStats.vue";
import IqChart from "@/components/stats/IqChart.vue";
</script>

<template>
  <div class="fr-mt-3w fr-mt-md-5w grid-2x2-container" data-testid="quality-page">
    <div class="cell alerts-cell">
      <GlobalStats data-testid="quality-global-stats" />
    </div>
    <div class="cell chart-1-cell">
      <ApplicationsIqChart data-testid="quality-iq-chart" />
    </div>

    <div class="cell chart-2-cell">
      <ApplicationsChart data-testid="quality-applications-chart" />
    </div>

    <div class="cell chart-3-cell">
      <IqChart data-testid="quality-iq-trend-chart" />
    </div>
  </div>
</template>

<style scoped>
.grid-2x2-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: auto auto;
  gap: 1.5rem;

  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  box-sizing: border-box;
  padding: 0 1rem;
}

@media (max-width: 700px) {
  .grid-2x2-container {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto auto;
  }
}
</style>
