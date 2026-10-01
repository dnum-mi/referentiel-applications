<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, computed, watch } from "vue";
import { useHostingStore } from "@/stores/hostingStore";
import { useStatisticsStore } from "@/stores/statisticsStore";
import { useUserStore } from "@/stores/userStore";
import api from "@/api/index";

const actorsNb = ref(0);
const compliancesNb = ref(0);
const hostingsNb = ref(0);
const endOfLifeAppsNb = ref<number | null>(null);
const endOfLifeError = ref(false);
const isLoading = ref(false);
const errorMessage = ref("");

const statisticStore = useStatisticsStore();
const hostingStore = useHostingStore();
const userStore = useUserStore();
let endOfLifeRequestSequence = 0;

const datasGroup = computed(() => [
  // Ce total couvre désormais toutes les fiches, quel que soit leur statut : c'est
  // le dénominateur de « X application(s) trouvée(s) sur Y » du catalogue, qui doit
  // rester supérieur au nombre de résultats même quand l'utilisateur coche
  // « Supprimée » dans les filtres.
  `Nombre d'applications : ${statisticStore.totalApplications}`,
  `Nombre d'acteurs : ${actorsNb.value}`,
  `Nombre de conformités : ${compliancesNb.value}`,
  `Nombre d'hébergements : ${hostingsNb.value}`,
  ...(userStore.canListTechnologies
    ? [
        `Applications concernées par une fin de vie dans votre périmètre : ${endOfLifeAppsNb.value ?? (endOfLifeError.value ? "indisponible" : "chargement…")}`,
      ]
    : []),
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
  } catch (error) {
    errorMessage.value = `Erreur lors du chargement des données : ${error}`;
  } finally {
    isLoading.value = false;
  }
}

async function loadEndOfLifeStats() {
  const request = ++endOfLifeRequestSequence;
  endOfLifeAppsNb.value = null;
  endOfLifeError.value = false;
  if (!userStore.canListTechnologies) return;

  const isCurrentRequest = () => request === endOfLifeRequestSequence && userStore.canListTechnologies;
  try {
    // Le total couvre les fins de vie du périmètre autorisé. L'absence de statut
    // conserve ce filtre API historique ; `all` compterait aussi les technologies saines.
    const response = await api.endOfLifeControllerFindEndOfLifeApplications({ query: { page: 0, pageSize: 1 } });
    if (!isCurrentRequest()) return;
    if (!response.response.ok || !response.data) {
      endOfLifeError.value = true;
      return;
    }
    endOfLifeAppsNb.value = response.data.total;
  } catch {
    if (isCurrentRequest()) endOfLifeError.value = true;
  }
}

watch(
  () => [
    userStore.canListTechnologies,
    userStore.user?.id,
    userStore.user?.role,
    userStore.user?.scopeOrganizationId,
    userStore.user?.scopeOrganization?.path,
  ],
  loadEndOfLifeStats,
  { immediate: true, flush: "sync" },
);

onBeforeUnmount(() => endOfLifeRequestSequence++);

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
