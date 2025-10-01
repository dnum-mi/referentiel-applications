<script setup lang="ts">
import { ref, watch, onMounted, computed } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";
import { useStatisticsStore } from "@/stores/statisticsStore";
import { useUserStore } from "@/stores/userStore";
import { AdminLevel } from "@/models/user";

import ApplicationTableView from "@/components/ApplicationTableView.vue";
import ApplicationCardView from "@/components/ApplicationCardView.vue";
import SidebarFilters from "@/components/search/SidebarFilter.vue";
import AppLoader from "@/components/AppLoader.vue";
import ReportAnomaly from "@/components/modal/reportAnomaly.vue";
import CreateApplicationModal from "@/components/modal/CreateApplicationModal.vue";

const statsStore = useStatisticsStore();
const searchStore = useApplicationSearchStore();
const userStore = useUserStore();

const currentSortedColumn = ref("label");
const isMobile = ref(false);
const isReportMissingOpen = ref(false);
const isCreateModalOpen = ref(false);

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

      <div v-if="searchStore.isLoading" class="loader" data-testid="application-loader">
        <AppLoader />
      </div>
      <div class="fr-mb-5w">
        <DsfrToggleSwitch v-model="isMobile" active-text="Mode Tuiles" inactive-text="Mode Tableau" data-testid="application-toggle-view" />
      </div>

      <div class="fr-grid-row fr-grid-row--gutters fr-mb-1w">
        <div class="fr-col-auto">
          <DsfrButton
            secondary
            icon="fr-icon-add-line"
            type="button"
            :disabled="userStore.adminLevel < AdminLevel.WRITE"
            data-testid="create-application-btn"
            @click="isCreateModalOpen = true"
          >
            Créer une application
          </DsfrButton>
        </div>
        <div class="fr-col-auto">
          <DsfrButton
            secondary
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
      </div>

      <ReportAnomaly
        :opened="isReportMissingOpen"
        context="global"
        @close="isReportMissingOpen = false"
      />

      <CreateApplicationModal
        :opened="isCreateModalOpen"
        @close="isCreateModalOpen = false"
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
</style>
