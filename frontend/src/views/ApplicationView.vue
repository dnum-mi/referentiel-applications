<script setup lang="ts">
import { ref, watch, onMounted, computed } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";
import { useStatisticsStore } from "@/stores/statisticsStore";

import ApplicationTableView from "@/components/ApplicationTableView.vue";
import ApplicationCardView from "@/components/ApplicationCardView.vue";
import SidebarFilters from "@/components/search/SidebarFilter.vue";
import AppLoader from "@/components/AppLoader.vue";

const statsStore = useStatisticsStore();
const searchStore = useApplicationSearchStore();

const currentSortedColumn = ref("label");
const isMobile = ref(false);
const showLoader = ref(false);

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
const updateMode = () => {
  isMobile.value = window.matchMedia("(max-width: 768px)").matches;
};

// Mise à jour du tri (colonne cliquée)
watch(currentSortedColumn, (val) => {
  searchStore.setFilter("sortBy", val);
});

watch([() => searchStore.page, () => searchStore.limit], () => {
  searchStore.searchApplications();
});

// Init
onMounted(async () => {
  updateMode();
  window.addEventListener("resize", updateMode);
  statsStore.fetchTotalApplications();
  searchStore.searchApplications();
});

const displayMode = computed(() => (isMobile.value ? "tiles" : "table"));
</script>

<template>
  <div class="layout">
    <SidebarFilters />

    <main class="main-content">
      <div v-if="showLoader" class="loader">
        <AppLoader />
      </div>

      <div class="toggle-and-create-container">
        <DsfrToggleSwitch v-model="isMobile" active-text="Mode Tuiles" inactive-text="Mode Tableau" />
        <CreateApplication />
      </div>

      <ApplicationTableView v-if="displayMode === 'table'" v-model:sortedBy="currentSortedColumn" />
      <ApplicationCardView v-else />
    </main>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  align-items: stretch;
}

@media (max-width: 768px) {
  .layout {
    flex-direction: column;
  }
}

.main-content {
  flex: 1;
  padding: 1rem;
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

.summary-box {
  background-color: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 1rem;
  margin: 1rem 0;
  font-size: 0.95rem;
  color: #1e293b;
}
</style>
