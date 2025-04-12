<script setup lang="ts">
import { ref, watch, onMounted, computed } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";
import ApplicationTableView from "@/components/ApplicationTableView.vue";
import ApplicationCardView from "@/components/ApplicationCardView.vue";
import SidebarFilters from "@/components/search/SidebarFilter.vue";
import AppLoader from "@/components/AppLoader.vue";

const searchStore = useApplicationSearchStore();
const currentSortedColumn = ref("label");
const isMobile = ref(false);

// Loader différé
const showLoader = ref(false);
let loaderTimeout: ReturnType<typeof setTimeout> | null = null;

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

const updateMode = () => {
  isMobile.value = window.matchMedia("(max-width: 768px)").matches;
};

watch(currentSortedColumn, (val) => {
  searchStore.setFilter("sortBy", val);
});

onMounted(() => {
  updateMode();
  window.addEventListener("resize", updateMode);
  searchStore.searchApplications();
});

const displayMode = computed(() => (isMobile.value ? "tiles" : "table"));
</script>

<template>
  <div class="layout">
    <!-- Sidebar -->
    <SidebarFilters />

    <!-- Main Content -->
    <main class="main-content">
      <CreateApplication />

      <div v-if="showLoader" class="loader">
        <AppLoader />
      </div>

      <div class="view-toggle">
        <DsfrToggleSwitch v-model="isMobile" active-text="Mode Tuiles" inactive-text="Mode Tableau" />
      </div>

      <ApplicationTableView v-if="displayMode === 'table'" v-model:sortedBy="currentSortedColumn" />
      <ApplicationCardView v-else />
    </main>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
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
.view-toggle {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1rem;
}
</style>
