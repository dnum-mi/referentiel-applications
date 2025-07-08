<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { useActorStore } from "@/stores/actorStore";
import { useHostingStore } from "@/stores/hostingStore";
import CompliancesApi from "@/api/compliance";
import { useStatisticsStore } from "@/stores/statisticsStore";

const actorsNb = ref(0);
const compliancesNb = ref(0);
const hostingsNb = ref(0);
const isLoading = ref(false);
const errorMessage = ref("");

const statisticStore = useStatisticsStore();
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
    compliancesNb.value = await CompliancesApi.countCompliances();
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
    <div v-if="isLoading">Chargement...</div>
    <div v-else-if="errorMessage">{{ errorMessage }}</div>
    <div v-else>
      <h3>Informations au : {{ new Date().toLocaleDateString("fr-FR") }}</h3>
      <DsfrAlert
        v-for="(description, index) in datasGroup"
        :key="index"
        type="info"
        :description="description"
        title-tag="h3"
        :small="true"
      />
    </div>
  </div>
</template>
