<script setup lang="ts">
import AppLoader from "@/components/AppLoader.vue";
import ApplicationCardView from "@/components/ApplicationCardView.vue";
import ApplicationSearchActions from "@/components/ApplicationSearchActions.vue";
import ApplicationTableView from "@/components/ApplicationTableView.vue";
import SidebarFilters from "@/components/search/SidebarFilter.vue";
import { useApplicationSearch } from "@/composables/use-application-search";
import { useSearchAccessContext } from "@/composables/use-search-access-context";
import { useStatisticsStore } from "@/stores/statisticsStore";
import { useUserStore } from "@/stores/userStore";
import { useMediaQuery } from "@vueuse/core";
import { computed, onMounted, watch } from "vue";

const statsStore = useStatisticsStore();
const { isLoading, searchApplications, averageIq, total, page, pageSize, error } = useApplicationSearch();
const userStore = useUserStore();
const accessContext = useSearchAccessContext();

const isMobile = useMediaQuery("(max-width: 768px)");

onMounted(() => {
  statsStore.countApplications();
  searchApplications().catch(() => {});
});

// Le composable purge immédiatement les données de l'ancien contexte. Seule la
// page du catalogue relance ensuite sa recherche, avec les filtres conservés.
watch(
  accessContext,
  () => {
    if (userStore.hasApplicationAccess) searchApplications().catch(() => {});
  },
  { flush: "post" },
);

const displayMode = computed(() => (isMobile.value ? "tiles" : "table"));

const resultsStatus = computed(() => {
  if (isLoading.value) return "Chargement des résultats…";
  if (error.value) return "La recherche a échoué. Les résultats n’ont pas été actualisés.";
  const pageCount = pageSize.value > 0 ? Math.max(1, Math.ceil(total.value / pageSize.value)) : 1;
  const currentPage = Math.max(0, Math.min(page.value, pageCount - 1)) + 1;
  return `${total.value} application${total.value === 1 ? "" : "s"} trouvée${total.value === 1 ? "" : "s"}. Page ${currentPage} sur ${pageCount}.`;
});

const averageIqDisplay = computed(() => {
  if (averageIq.value === null) return "-";
  const rounded = Math.round(averageIq.value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
});
</script>

<template>
  <div class="layout" data-testid="application-view">
    <SidebarFilters data-testid="application-filters" />

    <section class="main-content" data-testid="main-content">
      <h1 class="fr-h1" data-testid="application-search-title">Recherche d'applications</h1>

      <div v-if="isLoading" class="loader" data-testid="application-loader" aria-hidden="true">
        <AppLoader />
      </div>

      <output class="fr-sr-only" aria-live="polite" aria-atomic="true" data-testid="application-results-status">
        {{ resultsStatus }}
      </output>

      <div class="search-actions-wrapper" data-testid="application-search-actions-wrapper">
        <ApplicationSearchActions />
      </div>

      <p class="average-iq" data-testid="application-average-iq">
        <span class="average-iq__label">IQ moyen (Applications Filtrées) : </span>
        <span class="average-iq__value">{{ averageIqDisplay }}</span>
      </p>

      <section id="application-results" class="application-results" :aria-busy="isLoading" tabindex="-1">
        <ApplicationTableView v-if="displayMode === 'table'" data-testid="application-table-view" />
        <ApplicationCardView v-else data-testid="application-card-view" />
      </section>
    </section>
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
