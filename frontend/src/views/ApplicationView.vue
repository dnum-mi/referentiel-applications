<script setup lang="ts">
import { ref, watch, onMounted, computed } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";
import { useStatisticsStore } from "@/stores/statisticsStore";

import ApplicationTableView from "@/components/ApplicationTableView.vue";
import ApplicationCardView from "@/components/ApplicationCardView.vue";
import SidebarFilters from "@/components/search/SidebarFilter.vue";
import AppLoader from "@/components/AppLoader.vue";
import ReportAnomaly from "@/components/modal/reportAnomaly.vue";

const statsStore = useStatisticsStore();
const searchStore = useApplicationSearchStore();

const currentSortedColumn = ref("label");
const isMobile = ref(false);
const showLoader = ref(false);
const isReportMissingOpen = ref(false);

let loaderTimeout: ReturnType<typeof setTimeout> | null = null;

// Affichage progressif du loader
watch(
  () => searchStore.isLoading,
  (isLoading) => {
    if (isLoading) {
      loaderTimeout = setTimeout(() => {
        showLoader.value = true;
      }, 200);
    } else {
      clearTimeout(loaderTimeout!);
      loaderTimeout = null;
      showLoader.value = false;
    }
  },
);

// Mode mobile ou desktop
function updateMode() {
  isMobile.value = window.matchMedia("(max-width: 768px)").matches;
}

// Mise à jour du tri (colonne cliquée)
watch(currentSortedColumn, (val) => {
  searchStore.setFilter({ sortBy: val });
});

watch([() => searchStore.page, () => searchStore.pageSize], () => {
  searchStore.searchApplications();
});

// Init
onMounted(async () => {
  updateMode();
  window.addEventListener("resize", updateMode);
  statsStore.countApplications();
  searchStore.searchApplications();
});

const displayMode = computed(() => (isMobile.value ? "tiles" : "table"));
</script>

<template>
  <div class="layout" data-testid="application-view">
    <SidebarFilters data-testid="application-filters" />

    <main class="main-content">
      <h1 class="fr-h1" data-testid="application-search-title">
        Recherche d'applications
      </h1>

      <div v-if="showLoader" class="loader" data-testid="application-loader">
        <AppLoader />
      </div>

      <div class="toggle-and-create-container" data-testid="application-toggle-create">
        <DsfrToggleSwitch v-model="isMobile" active-text="Mode Tuiles" inactive-text="Mode Tableau" data-testid="application-toggle-view" />
        <CreateApplication data-testid="application-create" />
      </div>

      <div class="secondary-actions">
        <DsfrButton
          priority="secondary"
          icon="fr-icon-alert-line"
          aria-haspopup="dialog"
          aria-controls="modal-report-missing"
          type="button"
          data-testid="report-missing-app"
          @click="isReportMissingOpen = true"
        >
          Signaler une application manquante
        </DsfrButton>
      </div>

      <ReportAnomaly
        :opened="isReportMissingOpen"
        context="global"
        @close="isReportMissingOpen = false"
      />

      <ApplicationTableView
        v-if="displayMode === 'table'"
        v-model:sorted-by="currentSortedColumn"
        data-testid="application-table-view"
      />
      <ApplicationCardView v-else data-testid="application-card-view" />
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

.toggle-and-create-container {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1.5rem;
}

.secondary-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: -0.5rem;
  margin-bottom: 1.5rem;
}
</style>
