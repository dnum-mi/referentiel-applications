<script setup lang="ts">
import { Permission } from "@/client";
import AppLoader from "@/components/AppLoader.vue";
import SidebarFilters from "@/components/search/SidebarFilter.vue";
import TechnicalDebtChart from "@/components/technical-debt/TechnicalDebtChart.vue";
import { useApplicationSearch, type TechnicalDebtPoint } from "@/composables/use-application-search";
import { useMditCampaigns } from "@/composables/use-mdit-campaigns";
import { useToasterStore } from "@/stores/toasterStore";
import { useUserStore } from "@/stores/userStore";
import { watchDebounced } from "@vueuse/core";
import { computed, onMounted, onBeforeUnmount, ref } from "vue";

const { searchApplications, setFilter, filters } = useApplicationSearch();
const { loadActiveCampaigns, latestYear } = useMditCampaigns();
const userStore = useUserStore();
const toaster = useToasterStore();

const technicalDebtPoints = ref<TechnicalDebtPoint[]>([]);
const isTechnicalDebtLoading = ref(true);
const technicalDebtError = ref("");
let latestRequest = 0;
let disposed = false;
const hasMDITReadPermission = computed(() => userStore.hasPermissions([Permission.MDIT_LIST]));

onMounted(async () => {
  if (!hasMDITReadPermission.value) {
    setFilter({ myApplications: true });
  }
  try {
    // `loadActiveCampaigns` est appelé avec `throwOnError: true` : sans ce try/catch, un échec
    // réseau laissait une exception non gérée et bloquait `loadTechnicalDebtPoints()` juste après,
    // avec la page silencieusement vide (pas d'erreur affichée, pas de fin de chargement).
    await loadActiveCampaigns();
  } catch (error) {
    console.error("Erreur lors du chargement des campagnes de dette technique :", error);
    toaster.addErrorMessage("Erreur lors du chargement des campagnes.");
  }
  loadTechnicalDebtPoints();
});

async function loadTechnicalDebtPoints() {
  if (disposed) return;
  const request = ++latestRequest;
  isTechnicalDebtLoading.value = true;
  technicalDebtError.value = "";
  try {
    // Sans choix explicite, on présente la campagne la plus récente.
    const millesime = filters.value.millesime ?? latestYear.value;
    const response = await searchApplications({ pageSize: 0, ...(millesime == null ? undefined : { millesime }) });
    if (request === latestRequest) technicalDebtPoints.value = response.technicalDebtPoints;
  } catch {
    if (request === latestRequest) {
      technicalDebtPoints.value = [];
      technicalDebtError.value = "Impossible de charger les données TIME pour les filtres sélectionnés.";
    }
  } finally {
    if (request === latestRequest) isTechnicalDebtLoading.value = false;
  }
}

watchDebounced(
  () => filters.value,
  () => {
    loadTechnicalDebtPoints();
  },
  { deep: true, debounce: 300 },
);
onBeforeUnmount(() => {
  disposed = true;
  latestRequest++;
});
</script>

<template>
  <div class="layout" data-testid="time-view">
    <SidebarFilters :is-lock-my-permission="!hasMDITReadPermission" data-testid="time-filters" type="technicalDebtPoints" />

    <section class="main-content" data-testid="main-content">
      <h1 class="fr-h1" data-testid="time-title">Time</h1>

      <section id="technical-debt-chart" class="chart-section" data-testid="technical-debt-chart-section">
        <output v-if="isTechnicalDebtLoading" class="loader" aria-live="polite" aria-atomic="true">
          <AppLoader />
          <span class="sr-only">Chargement du graphique…</span>
        </output>
        <div v-else-if="technicalDebtError">
          <p role="alert">{{ technicalDebtError }}</p>
          <DsfrButton @click="loadTechnicalDebtPoints">Réessayer le chargement TIME</DsfrButton>
        </div>
        <TechnicalDebtChart v-else :data="technicalDebtPoints" />
      </section>
    </section>
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
  min-width: 0;
  padding: 1rem 2rem;
}

@media (max-width: 480px) {
  .main-content {
    padding: 0.5rem 1rem;
  }
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
