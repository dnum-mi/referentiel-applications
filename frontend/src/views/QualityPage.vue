<script setup lang="ts">
import ApplicationsChart from "@/components/stats/ApplicationsChart.vue";
import ApplicationsIqChart from "@/components/stats/ApplicationsIqChart.vue";
import GlobalStats from "@/components/stats/GlobalStats.vue";
import IqChart from "@/components/stats/IqChart.vue";
</script>

<template>
  <div class="fr-container" data-testid="quality-page">
    <h1 data-testid="quality-page-title">Qualité générale</h1>
    <div class="fr-grid-row fr-grid-row--gutters">
      <div class="fr-col-12 fr-col-md-6">
        <GlobalStats data-testid="quality-global-stats" />
      </div>
      <div class="fr-col-12 fr-col-md-6">
        <ApplicationsIqChart data-testid="quality-iq-chart" />
      </div>
      <div class="fr-col-12 fr-col-md-6">
        <ApplicationsChart data-testid="quality-applications-chart" />
      </div>
      <div class="fr-col-12 fr-col-md-6">
        <IqChart data-testid="quality-iq-trend-chart" />
      </div>
    </div>
  </div>
</template>
