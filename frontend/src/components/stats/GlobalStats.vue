<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { useActorStore } from "@/stores/actorStore";
import { useHostingStore } from "@/stores/hostingStore";
import { useStatisticsStore } from "@/stores/statisticsStore";

const actorsNb = ref(0);
const compliancesNb = ref(0);
const hostingsNb = ref(0);
const isLoading = ref(false);
const errorMessage = ref("");

const statisticStore = useStatisticsStore();
const statsStore = useStatisticsStore();
const actorStore = useActorStore();
const hostingStore = useHostingStore();

const datasGroup = computed(() => [
  `Nombre d'applications (hors applications supprimées): ${statisticStore.totalApplications}`,
  `Nombre d'acteurs : ${actorsNb.value}`,
  `Nombre de conformités : ${compliancesNb.value}`,
  `Nombre d'hébergements : ${hostingsNb.value}`,
]);

async function loadStats() {
  isLoading.value = true;
  try {
    await statisticStore.countApplications();
    actorsNb.value = await actorStore.countActors();
    compliancesNb.value = await statsStore.countCompliances();
    hostingsNb.value = await hostingStore.countHostings();
  } catch (error) {
    errorMessage.value = `Erreur lors du chargement des données : ${error}`;
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  loadStats();
});
</script>

<template>
  <div class="cell alerts-cell">
    <div v-if="isLoading" data-testid="global-stats-loading">
      Chargement...
    </div>
    <div v-else-if="errorMessage" data-testid="global-stats-error">
      {{ errorMessage }}
    </div>
    <div v-else data-testid="global-stats-data">
      <h3>Informations au : {{ new Date().toLocaleDateString("fr-FR") }}</h3>
      <DsfrHighlight
        v-for="(description, index) in datasGroup"
        :key="index"
        :small="true"
        :data-testid="`global-stats-item-${index}`"
    >
        {{ description }}
      </DsfrHighlight>
    </div>
  </div>
</template>
