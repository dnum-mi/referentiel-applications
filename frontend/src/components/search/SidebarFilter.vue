<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute } from "vue-router";
import { useApplicationSearch } from "@/composables/use-application-search";
import { useMditCampaigns } from "@/composables/use-mdit-campaigns";
import CampaignFilter from "@/components/search/CampaignFilter.vue";
import ActorFilter from "@/components/search/ActorFilter.vue";
import HostingFilter from "@/components/search/HostingFilter.vue";
import QualityFilter from "@/components/search/QualityFilter.vue";
import ApplicationFilter from "@/components/search/ApplicationFilter.vue";
import PriorityRestartFilter from "@/components/search/PriorityRestartFilter.vue";
import DataFilter from "@/components/search/DataFilter.vue";
import { useAccordionManager } from "@/composables/use-accordion-manager";
import { useStatisticsStore } from "@/stores/statisticsStore";
import { useUserStore } from "@/stores/userStore";
import SavedFiltersPanel from "./SavedFiltersPanel.vue";
import StatusFilter from "./StatusFilter.vue";
import { DsfrButton, DsfrToggleSwitch } from "@gouvminint/vue-dsfr";

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    isLockMyPermission?: boolean;
    type?: "technicalDebtPoints" | "applications";
  }>(),
  {
    isLockMyPermission: false,
    type: "applications",
  },
);

const sidebarOpen = ref(true);
const route = useRoute();
// Le sélecteur de campagne (millésime) ne concerne que le diagramme Time.
const isTimeRoute = computed(() => route.path === "/time");
const { total: applicationsTotal, resetFilters, filters, setFilter, TIME_DEFAULT_FILTERS } = useApplicationSearch();
const { latestYear } = useMditCampaigns();

function handleReset() {
  resetFilters(isTimeRoute.value ? { ...TIME_DEFAULT_FILTERS, millesime: latestYear.value } : undefined);
}
const statsStore = useStatisticsStore();
const userStore = useUserStore();

const { openAccordions, toggle } = useAccordionManager(10, true);

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

const total = computed(() => {
  return props.type === "applications" ? applicationsTotal : statsStore.technicalDebtPointTotal;
});
</script>

<template>
  <Transition name="sidebar-width">
    <aside v-if="sidebarOpen" class="sidebar" v-bind="$attrs" data-testid="sidebar-filter">
      <div class="filters-wrapper">
        <DsfrButton tertiary size="small" class="reset-link" data-testid="sidebar-reset-filters-button" @click="handleReset">
          ✕ Réinitialiser
        </DsfrButton>

        <h2 class="fr-h6">Filtres</h2>

        <DsfrAccordion
          v-if="userStore.user?.email"
          :selected="openAccordions.includes(9)"
          title="Filtres sauvegardés"
          data-testid="sidebar-accordion-saved-filters"
          @click="toggle(9)"
        >
          <SavedFiltersPanel />
        </DsfrAccordion>

        <p class="total-count" data-testid="sidebar-total-count">
          {{ total }} application(s) trouvée(s) sur {{ statsStore.totalApplications }}
        </p>

        <DsfrToggleSwitch
          v-if="userStore.user?.email"
          :disabled="props.isLockMyPermission"
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

        <DsfrAccordion
          :selected="openAccordions.includes(0)"
          title="Portefeuille"
          data-testid="sidebar-accordion-portfolio"
          class="portfolio-accordion"
          @click="toggle(0)"
        >
          <BusinessDivisionSearch
            label="Direction métier"
            tooltip-content="Recherche les applications rattachées à au moins une des directions de métier sélectionnées."
            :business-division-ids="filters.businessDivisionId"
            @update:business-division-ids="(ids) => setFilter({ businessDivisionId: ids, page: 0 })"
          />
          <CampaignFilter v-if="isTimeRoute" />
        </DsfrAccordion>

        <DsfrAccordion
          :selected="openAccordions.includes(1)"
          title="Informations génerales"
          data-testid="sidebar-accordion-general"
          @click="toggle(1)"
        >
          <ApplicationFilter />
          <PriorityRestartFilter />
        </DsfrAccordion>

        <DsfrAccordion :selected="openAccordions.includes(2)" title="Statut" data-testid="sidebar-accordion-status" @click="toggle(2)">
          <StatusFilter />
        </DsfrAccordion>

        <DsfrAccordion
          :selected="openAccordions.includes(3)"
          title="Organisation & Acteurs"
          data-testid="sidebar-accordion-organization"
          @click="toggle(3)"
        >
          <ActorFilter />
        </DsfrAccordion>

        <DsfrAccordion
          :selected="openAccordions.includes(4)"
          title="Hébergement"
          data-testid="sidebar-accordion-hosting"
          @click="toggle(4)"
        >
          <HostingFilter />
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

        <DsfrAccordion :selected="openAccordions.includes(8)" title="Qualité" data-testid="sidebar-accordion-quality" @click="toggle(8)">
          <QualityFilter />
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
  border-right: 1px solid var(--border-contrast-grey);
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
    border-bottom: 1px solid var(--border-contrast-grey);
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
  border: 1px solid var(--border-contrast-grey);
  border-radius: 0 6px 6px 0;
  width: 32px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3a3a3a;
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

.portfolio-accordion {
  margin-bottom: 1rem;
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
