<script setup lang="ts">
import { ref } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";

import ActorFilter from "@/components/search/ActorFilter.vue";
import HostingFilter from "@/components/search/HostingFilter.vue";
import ApplicationFilter from "@/components/search/ApplicationFilter.vue";

const sidebarOpen = ref(true);
const searchStore = useApplicationSearchStore();

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

        <div class="filter-block">
          <ActorFilter />
        </div>
        <div class="filter-block">
          <HostingFilter />
        </div>
        <div class="filter-block">
          <ApplicationFilter />
        </div>
      </div>
    </aside>
  </Transition>

  <!-- Toggle Button toujours visible -->
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
  background-color: transparent;
  display: flex;
  flex-direction: column;
  padding: 1rem 0.5rem;
}

.filters-wrapper {
  flex: 1;
  overflow-y: auto;
  max-height: calc(100vh - 3rem); /* prend tout sauf le toggle et le reset */
  padding: 0 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.filter-block {
  border: 1px solid #e2e8f0;
  background-color: #fff;
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.9rem;
}

/* Toggle Button */
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
  z-index: 20;
}
.sidebar-toggle:hover {
  opacity: 1;
  background-color: #f3f4f6;
}
.sidebar-toggle-icon {
  font-size: 1.2rem;
}

/* Reset link */
.reset-link {
  margin-left: auto;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  align-self: flex-end;
  color: #d60000;
}
.reset-link:hover {
  text-decoration: underline;
}

.sidebar-width-enter-active,
.sidebar-width-leave-active {
  transition: all 0.3s ease;
}
.sidebar-width-enter-from,
.sidebar-width-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>
