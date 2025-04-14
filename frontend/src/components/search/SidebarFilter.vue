<script setup lang="ts">
import { ref } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";

import ActorFilter from "@/components/search/ActorFilter.vue";
import HostingFilter from "@/components/search/HostingFilter.vue";
import ApplicationFilter from "@/components/search/ApplicationFilter.vue";
import OrganizationFilter from "@/components/search/OrganizationFilter.vue";
import { useAccordionManager } from "@/composables/use-accordion-manager";
import { useStatisticsStore } from "@/stores/statisticsStore";
import { routeNames } from "@/router/route-names";

const sidebarOpen = ref(true);
const searchStore = useApplicationSearchStore();
const statsStore = useStatisticsStore();

const { openAccordions, toggle } = useAccordionManager(3, true);

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value;
}

function resetAllFilters() {
  searchStore.resetFilters();
  searchStore.searchApplications();
}
</script>

<template>
  <Transition name="sidebar-width">
    <aside class="sidebar" v-if="sidebarOpen">
      <div class="filters-wrapper">
        <p class="reset-link" @click="resetAllFilters" title="Réinitialiser les filtres">✕ Réinitialiser</p>

        <h5>Filtres</h5>
        <p class="total-count">{{ searchStore.total }} application(s) trouvée(s) sur {{ statsStore.totalApplications }}</p>

        <DsfrAccordion :selected="openAccordions.includes(0)" @click="toggle(0)" title="Général">
          <ApplicationFilter />
        </DsfrAccordion>

        <DsfrAccordion :selected="openAccordions.includes(1)" @click="toggle(1)" title="Organisation & Acteurs">
          <ActorFilter />
          <OrganizationFilter />
        </DsfrAccordion>

        <DsfrAccordion :selected="openAccordions.includes(2)" @click="toggle(2)" title="Hébergement">
          <HostingFilter />
        </DsfrAccordion>
      </div>
    </aside>
  </Transition>

  <button class="sidebar-toggle" @click="toggleSidebar" :aria-label="sidebarOpen ? 'Fermer les filtres' : 'Ouvrir les filtres'">
    <VIcon :name="sidebarOpen ? 'ri-arrow-left-s-line' : 'ri-arrow-right-s-line'" class="sidebar-toggle-icon" />
  </button>
</template>

<style scoped>
.sidebar {
  width: 280px;
  border-right: 1px solid #e5e7eb;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.03);
  height: 100vh;
  position: relative;
  z-index: 5;
  display: flex;
  flex-direction: column;
  padding: 1rem 0.5rem;
  transition: all 0.3s ease;
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    max-height: 100vh;
    height: 100vh;
    overflow-y: auto;
    z-index: 1000;
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
    padding: 1rem;
  }

  .sidebar-toggle {
    left: auto;
    right: 0;
    border-radius: 6px 0 0 6px;
  }
}

.sidebar-toggle {
  position: fixed;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  background: white;
  border: 1px solid #dcdfe3;
  border-radius: 0 6px 6px 0;
  width: 32px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #555;
  box-shadow: 2px 2px 6px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.2s ease;
  opacity: 0.7;
  z-index: 1010;
}
.sidebar-toggle:hover {
  opacity: 1;
  background-color: #f3f4f6;
}
.sidebar-toggle-icon {
  font-size: 1.2rem;
}

.filters-wrapper {
  flex: 1;
  overflow-y: auto;
  max-height: calc(100vh - 3rem);
  padding: 0 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.reset-link {
  margin-left: auto;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  align-self: flex-end;
}
.reset-link:hover {
  text-decoration: underline;
}

.sidebar-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.total-count {
  font-size: 0.875rem;
  color: #444;
  margin: 0.25rem 0 0;
}
</style>
