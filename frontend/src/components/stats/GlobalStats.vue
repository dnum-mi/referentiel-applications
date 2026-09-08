<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { useHostingStore } from "@/stores/hostingStore";
import { useStatisticsStore } from "@/stores/statisticsStore";
import api from "@/api/index";

const actorsNb = ref(0);
const compliancesNb = ref(0);
const hostingsNb = ref(0);
const endOfLifeAppsNb = ref(0);
const isLoading = ref(false);
const errorMessage = ref("");

const statisticStore = useStatisticsStore();
const hostingStore = useHostingStore();

const datasGroup = computed(() => [
  // Ce total couvre désormais toutes les fiches, quel que soit leur statut : c'est
  // le dénominateur de « X application(s) trouvée(s) sur Y » du catalogue, qui doit
  // rester supérieur au nombre de résultats même quand l'utilisateur coche
  // « Supprimée » dans les filtres.
  `Nombre d'applications : ${statisticStore.totalApplications}`,
  `Nombre d'acteurs : ${actorsNb.value}`,
  `Nombre de conformités : ${compliancesNb.value}`,
  `Nombre d'hébergements : ${hostingsNb.value}`,
  `Applications concernées par une fin de vie : ${endOfLifeAppsNb.value}`,
]);

async function loadStats() {
  isLoading.value = true;
  try {
    // La page de statistiques veut un chiffre à jour : on force le rechargement.
    await statisticStore.countApplications(true);
    const actorsResponse = await api.actorControllerCountAllActors();
    actorsNb.value = actorsResponse.data ?? 0;
    compliancesNb.value = await statisticStore.countCompliances();
    hostingsNb.value = await hostingStore.countHostings();
    // On réutilise la vue transverse en ne demandant qu'une ligne : c'est son
    // `total` qui nous intéresse, pas les résultats. Un endpoint de comptage
    // dédié ferait doublon avec un filtre déjà écrit et testé.
    const endOfLifeResponse = await api.endOfLifeControllerFindEndOfLifeApplications({
      query: { page: 0, pageSize: 1 },
    });
    endOfLifeAppsNb.value = endOfLifeResponse.data?.total ?? 0;
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
    <div v-if="isLoading" data-testid="global-stats-loading">Chargement...</div>
    <div v-else-if="errorMessage" data-testid="global-stats-error">
      {{ errorMessage }}
    </div>
    <div v-else data-testid="global-stats-data">
      <h3>Informations au : {{ new Date().toLocaleDateString("fr-FR") }}</h3>
      <DsfrHighlight v-for="(description, index) in datasGroup" :key="index" :small="true" :data-testid="`global-stats-item-${index}`">
        {{ description }}
      </DsfrHighlight>
    </div>
  </div>
</template>
