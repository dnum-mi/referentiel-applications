<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useApplicationSearch } from "@/composables/use-application-search";
import { useStatisticsStore } from "@/stores/statisticsStore";
import ApplicationTableView from "@/components/ApplicationTableView.vue";
import ApplicationCardView from "@/components/ApplicationCardView.vue";
import SidebarFilters from "@/components/search/SidebarFilter.vue";
import AppLoader from "@/components/AppLoader.vue";
import ApplicationSearchActions from "@/components/ApplicationSearchActions.vue";

const statsStore = useStatisticsStore();
const { isLoading, searchApplications } = useApplicationSearch();

const isMobile = ref(false);

onMounted(() => {
  isMobile.value = window.matchMedia("(max-width: 768px)").matches;
  window.addEventListener("resize", () => {
    isMobile.value = window.matchMedia("(max-width: 768px)").matches;
  });
  statsStore.countApplications();
  searchApplications();
});

const displayMode = computed(() => (isMobile.value ? "tiles" : "table"));
</script>

<template>
  <div class="layout" data-testid="application-view">

    <SidebarFilters data-testid="application-filters" />

    <main class="main-content" id="main-content" data-testid="main-content" role="main">
      <h1 class="fr-h1" data-testid="application-search-title">
        Recherche d'applications
      </h1>

      <div v-if="isLoading" class="loader" data-testid="application-loader" role="status" aria-live="polite" aria-atomic="true">
        <AppLoader />
        <span class="sr-only">Chargement des résultats…</span>
      </div>

      <div class="search-actions-wrapper" data-testid="application-search-actions-wrapper">
        <ApplicationSearchActions />
      </div>

      <section
        id="application-results"
        class="application-results"
        aria-live="polite"
        :aria-busy="isLoading"
        tabindex="-1"
      >
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
}

.application-results {
  margin-top: 0.5rem;
}

.sr-only {
  position: absolute !important;
  height: 1px; width: 1px;
  overflow: hidden;
  clip: rect(1px, 1px, 1px, 1px);
  white-space: nowrap;
  border: 0;
  padding: 0;
  margin: -1px;
}
</style>