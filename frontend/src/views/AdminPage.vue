<script setup lang="ts">
import AdminUsersTab from "@/components/admin/AdminUsersTab.vue";
import AdminTagsTab from "@/components/admin/AdminTagsTab.vue";
import AdminBatchData from "@/components/admin/AdminBatchData.vue";
import AdminOrganizationsTab from "@/components/admin/AdminOrganizationsTab.vue";
import AdminActorsTab from "@/components/admin/AdminActorsTab.vue";
import { markRaw, ref, type Component } from "vue";
import AdminPermsMatrixTab from "@/components/admin/AdminPermsMatrixTab.vue";
import AdminLabelSourcesTab from "@/components/admin/AdminLabelSourcesTab.vue";
import AdminMditCampaignsTab from "@/components/admin/AdminMditCampaignsTab.vue";
import AdminTokensTab from "@/components/admin/AdminTokensTab.vue";
import AdminBusinessDivisionsTab from "@/components/admin/AdminBusinessDivisionsTab.vue";
import AdminCorrelationsTab from "@/components/admin/AdminCorrelationsTab.vue";
import AdminEmailLogsTab from "@/components/admin/AdminEmailLogsTab.vue";
import AdminQualityCampaignsTab from "@/components/admin/AdminQualityCampaignsTab.vue";
import { computed } from "vue";
import { Permission } from "@/client";
import { useUserStore } from "@/stores/userStore";

interface DsfrTab {
  title: string;
  icon?: string;
  tabId: string;
  panelId: string;
  component: Component;
  /** Permissions autorisant l'accès à l'onglet (OR) — par défaut `AdminPanelManage` seul. */
  permissions?: Permission[];
}

const userStore = useUserStore();
const activeTab = ref(0);
const allTabs: DsfrTab[] = [
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
  },
  {
    title: "Directions métier",
    icon: "ri-organization-chart",
    tabId: "tab-business-divisions",
    panelId: "panel-business-divisions",
    component: markRaw(AdminBusinessDivisionsTab),
  },
  {
    title: "Gestions des tags",
    icon: "ri-price-tag-line",
    tabId: "tab-tags",
    panelId: "panel-tags",
    component: markRaw(AdminTagsTab),
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
  },
  {
    title: "Gestion des tokens",
    icon: "ri-key-2-line",
    tabId: "tab-tokens",
    panelId: "panel-tokens",
    component: markRaw(AdminTokensTab),
  },
  {
    title: "Historique des e-mails",
    icon: "ri-mail-line",
    tabId: "tab-email-logs",
    panelId: "panel-email-logs",
    component: markRaw(AdminEmailLogsTab),
  },
  {
    title: "Campagnes de mise en qualité",
    icon: "ri-mail-send-line",
    tabId: "tab-quality-campaigns",
    panelId: "panel-quality-campaigns",
    component: markRaw(AdminQualityCampaignsTab),
    // Délégable à un non-admin (#2282) : seul onglet accessible sans AdminPanelManage.
    permissions: [Permission.ADMIN_PANEL_MANAGE, Permission.QUALITY_CAMPAIGN_MANAGE],
  },
  {
    title: "Revue des corrélations",
    icon: "ri-git-merge-line",
    tabId: "tab-correlations",
    panelId: "panel-correlations",
    component: markRaw(AdminCorrelationsTab),
    // Pas de `permissions` : le défaut du filtre ci-dessous est AdminPanelManage,
    // qui est exactement ce qu'exigent les endpoints de revue des corrélations.
  },
];

// Un utilisateur délégué uniquement QualityCampaignManage atteint /administration (cf. router)
// mais ne doit voir que l'onglet couvert par cette permission, pas le reste du panneau admin.
const tabs = computed(() => allTabs.filter((tab) => userStore.hasPermissions(tab.permissions ?? [Permission.ADMIN_PANEL_MANAGE])));

const tabsStyle = ref({ "--tabs-height": "auto" });
</script>

<template>
  <DsfrTabs v-model="activeTab" tab-list-name="Administration" :tab-titles="tabs" data-testid="admin-tabs" :style="tabsStyle">
    <template v-for="(tab, index) in tabs" :key="tab.panelId">
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
