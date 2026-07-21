<script setup lang="ts">
import AdminUsersTab from "@/components/admin/AdminUsersTab.vue";
import AdminTagsTab from "@/components/admin/AdminTagsTab.vue";
import AdminBatchData from "@/components/admin/AdminBatchData.vue";
import AdminOrganizationsTab from "@/components/admin/AdminOrganizationsTab.vue";
import AdminActorsTab from "@/components/admin/AdminActorsTab.vue";
import { computed, markRaw, ref, watch } from "vue";
import AdminPermsMatrixTab from "@/components/admin/AdminPermsMatrixTab.vue";
import AdminLabelSourcesTab from "@/components/admin/AdminLabelSourcesTab.vue";
import AdminMditCampaignsTab from "@/components/admin/AdminMditCampaignsTab.vue";
import AdminTokensTab from "@/components/admin/AdminTokensTab.vue";
import AdminFeatureFlagsTab from "@/components/admin/AdminFeatureFlagsTab.vue";
import { FeatureFlagKey } from "@/constants/feature-flags";
import { useFeatureFlagStore } from "@/stores/featureFlagStore";
import { useUserStore } from "@/stores/userStore";

interface DsfrTab {
  title: string;
  icon?: string;
  tabId: string;
  panelId: string;
  component: any;
  featureKey?: string;
  /** Onglet réservé aux administrateurs globaux (non restreints à un périmètre). */
  requiresGlobalAdmin?: boolean;
}

const featureFlagStore = useFeatureFlagStore();
const userStore = useUserStore();
const activeTab = ref(0);
const tabs = ref<DsfrTab[]>([
  {
    title: "Gestion des utilisateurs",
    icon: "ri-user-settings-line",
    tabId: "tab-users",
    panelId: "panel-users",
    component: markRaw(AdminUsersTab),
  },
  {
    title: "Gestion des organisations",
    icon: "ri-building-line",
    tabId: "tab-organizations",
    panelId: "panel-organizations",
    component: markRaw(AdminOrganizationsTab),
  },
  {
    title: "Gestion des acteurs",
    icon: "ri-team-line",
    tabId: "tab-actors",
    panelId: "panel-actors",
    component: markRaw(AdminActorsTab),
    // Cohérence kill-switch : l'API des acteurs est gatée par le même flag.
    featureKey: FeatureFlagKey.ACTORS,
  },
  {
    title: "Gestions des tags",
    icon: "ri-price-tag-line",
    tabId: "tab-tags",
    panelId: "panel-tags",
    component: markRaw(AdminTagsTab),
    featureKey: FeatureFlagKey.TAGS_MANAGEMENT,
  },
  {
    title: "Gestions des sources",
    icon: "ri-database-2-line",
    tabId: "tab-label-sources",
    panelId: "panel-label-sources",
    component: markRaw(AdminLabelSourcesTab),
  },
  {
    title: "Campagnes dette IT",
    icon: "ri-calendar-event-line",
    tabId: "tab-mdit-campaigns",
    panelId: "panel-mdit-campaigns",
    component: markRaw(AdminMditCampaignsTab),
    featureKey: FeatureFlagKey.MDIT_CAMPAIGNS,
  },
  {
    title: "Batch de données",
    icon: "ri-stack-line",
    tabId: "batch-data",
    panelId: "panel-batch-data",
    component: markRaw(AdminBatchData),
  },
  {
    title: "Matrice des permissions",
    icon: "ri-shield-user-line",
    tabId: "tab-app-perms-matrix",
    panelId: "panel-app-perms-matrix",
    component: markRaw(AdminPermsMatrixTab),
    featureKey: FeatureFlagKey.PERMISSIONS_MATRIX,
  },
  {
    title: "Gestion des tokens",
    icon: "ri-key-2-line",
    tabId: "tab-tokens",
    panelId: "panel-tokens",
    component: markRaw(AdminTokensTab),
    featureKey: FeatureFlagKey.API_TOKENS,
  },
  {
    // Volontairement non flaggé : désactiver ce flag verrouillerait l'accès à
    // l'écran qui permet de le réactiver. Réservé aux administrateurs GLOBAUX :
    // le feature flipping a un effet global, un admin de périmètre ne le voit
    // pas (le backend refuse de toute façon un compte scopé, 403).
    title: "Feature flags",
    icon: "ri-toggle-line",
    tabId: "tab-feature-flags",
    panelId: "panel-feature-flags",
    component: markRaw(AdminFeatureFlagsTab),
    requiresGlobalAdmin: true,
  },
]);

// Onglets réellement affichés : chaque onglet DÉCLARE ses conditions
// (featureKey, requiresGlobalAdmin) ; `canSee` est le seul juge.
const isGlobalAdmin = computed(() => !userStore.user?.scopeOrganizationId);
const canSee = (tab: DsfrTab) => featureFlagStore.allows(tab.featureKey) && (isGlobalAdmin.value || !tab.requiresGlobalAdmin);
const visibleTabs = computed(() => tabs.value.filter(canSee));

// `activeTab` est un index sur `visibleTabs` : quand la liste change (bascule
// d'un flag depuis l'onglet Feature flags), on réaligne l'index sur le même
// onglet via son panelId stable, sinon on le ramène dans les bornes.
watch(visibleTabs, (newTabs, oldTabs) => {
  const currentPanelId = oldTabs?.[activeTab.value]?.panelId;
  const nextIndex = currentPanelId ? newTabs.findIndex((tab) => tab.panelId === currentPanelId) : -1;
  activeTab.value = nextIndex >= 0 ? nextIndex : Math.min(activeTab.value, Math.max(newTabs.length - 1, 0));
});

const tabsStyle = ref({ "--tabs-height": "auto" });
</script>

<template>
  <DsfrTabs v-model="activeTab" tab-list-name="Administration" :tab-titles="visibleTabs" data-testid="admin-tabs" :style="tabsStyle">
    <template v-for="(tab, index) in visibleTabs" :key="tab.panelId">
      <KeepAlive>
        <DsfrTabContent
          v-if="activeTab === index"
          :panel-id="tab.panelId"
          :tab-id="tab.tabId"
          :aria-label="`Onglet ${tab.title}`"
          :data-testid="tab.panelId"
        >
          <component :is="tab.component" />
        </DsfrTabContent>
      </KeepAlive>
    </template>
  </DsfrTabs>
</template>
