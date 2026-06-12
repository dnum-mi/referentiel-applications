<script setup lang="ts">
import { ref, computed } from "vue";
import { useApplicationSearch } from "@/composables/use-application-search";
import ActorFilter from "@/components/search/ActorFilter.vue";
import HostingFilter from "@/components/search/HostingFilter.vue";
import QualityFilter from "@/components/search/QualityFilter.vue";
import ApplicationFilter from "@/components/search/ApplicationFilter.vue";
import PriorityRestartFilter from "@/components/search/PriorityRestartFilter.vue";
import DataFilter from "@/components/search/DataFilter.vue";
import { useAccordionManager } from "@/composables/use-accordion-manager";
import { useStatisticsStore } from "@/stores/statisticsStore";
import { useUserStore } from "@/stores/userStore";
import StatusFilter from "./StatusFilter.vue";
import { DsfrButton, DsfrToggleSwitch } from "@gouvminint/vue-dsfr";

const sidebarOpen = ref(true);
const { total, resetFilters, filters, setFilter } = useApplicationSearch();
const statsStore = useStatisticsStore();
const userStore = useUserStore();

const { openAccordions, toggle } = useAccordionManager(8, true);

const isMyAppsFilterActive = computed(() => {
  return !!(userStore.user?.email && filters.value.myApplications);
});

const isSubscribedAppsFilterActive = computed(() => {
  return !!(userStore.user?.email && filters.value.subscribersEmail);
});

function toggleMyAppsFilter(value: boolean) {
  setFilter({ myApplications: value ? true : undefined, page: 0 });
}
function toggleSubscribedAppsFilter(value: boolean) {
  setFilter({ subscribersEmail: value ? true : undefined, page: 0 });
}
</script>

<template>
  <Transition name="sidebar-width">
    <aside v-if="sidebarOpen" class="sidebar" data-testid="sidebar-filter">
      <div class="filters-wrapper">
        <DsfrButton tertiary size="small" class="reset-link" data-testid="sidebar-reset-filters-button" @click="resetFilters">
          ✕ Réinitialiser
        </DsfrButton>

        <h5>Filtres</h5>
        <p class="total-count" data-testid="sidebar-total-count">
          {{ total }} application(s) trouvée(s) sur {{ statsStore.totalApplications }}
        </p>

        <DsfrToggleSwitch
          v-if="userStore.user?.email"
          :model-value="isMyAppsFilterActive"
          label="Mes Applications"
          no-text
          data-testid="my-apps-filter-toggle"
          class="my-toggle-nowrap"
          @update:model-value="toggleMyAppsFilter"
        />

        <DsfrToggleSwitch
          :model-value="isSubscribedAppsFilterActive"
          label="Mes Abonnements"
          no-text
          data-testid="my-apps-filter-toggle-subscribed"
          class="my-toggle-nowrap"
          @update:model-value="toggleSubscribedAppsFilter"
        />

        <DsfrAccordion :selected="openAccordions.includes(0)" title="Général" data-testid="sidebar-accordion-general" @click="toggle(0)">
          <ApplicationFilter />
          <PriorityRestartFilter />
        </DsfrAccordion>

        <DsfrAccordion
          :selected="openAccordions.includes(1)"
          title="Organisation & Acteurs"
          data-testid="sidebar-accordion-organization"
          @click="toggle(1)"
        >
          <ActorFilter />
        </DsfrAccordion>

        <DsfrAccordion
          :selected="openAccordions.includes(2)"
          title="Hébergement"
          data-testid="sidebar-accordion-hosting"
          @click="toggle(2)"
        >
          <HostingFilter />
        </DsfrAccordion>

        <DsfrAccordion :selected="openAccordions.includes(3)" title="Qualité" data-testid="sidebar-accordion-quality" @click="toggle(3)">
          <QualityFilter />
        </DsfrAccordion>

        <DsfrAccordion :selected="openAccordions.includes(4)" title="Statut" data-testid="sidebar-accordion-status" @click="toggle(4)">
          <StatusFilter />
        </DsfrAccordion>

        <DsfrAccordion
          :selected="openAccordions.includes(5)"
          title="Conformité"
          data-testid="sidebar-accordion-compliance"
          @click="toggle(5)"
        >
          <ComplianceFilter />
        </DsfrAccordion>

        <DsfrAccordion
          :selected="openAccordions.includes(6)"
          title="Relations"
          data-testid="sidebar-accordion-relations"
          @click="toggle(6)"
        >
          <RelationFilter />
        </DsfrAccordion>

        <DsfrAccordion :selected="openAccordions.includes(7)" title="Données" data-testid="sidebar-accordion-donnees" @click="toggle(7)">
          <DataFilter />
        </DsfrAccordion>
      </div>
    </aside>
  </Transition>

  <button
    class="sidebar-toggle"
    data-testid="sidebar-toggle"
    :aria-label="sidebarOpen ? 'Fermer les filtres' : 'Ouvrir les filtres'"
    @click="sidebarOpen = !sidebarOpen"
  >
    <VIcon :name="sidebarOpen ? 'ri-arrow-left-s-line' : 'ri-arrow-right-s-line'" class="sidebar-toggle-icon" />
  </button>
</template>

<style scoped>
:deep(.fr-toggle__label) {
  white-space: nowrap;
}

.sidebar {
  width: 280px;
  border-right: 1px solid #e5e7eb;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.03);
  max-height: 100%;
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
    background-color: var(--background-default-grey);
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
  padding: 0 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.reset-link {
  align-self: flex-end;
}

.sidebar-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.total-count {
  font-size: 0.875rem;
  margin: 0.25rem 0 0;
}
</style>
