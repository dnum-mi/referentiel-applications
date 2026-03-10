<script setup lang="ts">
import AdminUsersTab from "@/components/admin/AdminUsersTab.vue";
import AdminTagsTab from "@/components/admin/AdminTagsTab.vue";
import AdminQualityTab from "@/components/admin/AdminQualityTab.vue";
import { ref } from "vue";
import AdminPermsMatrixTab from "@/components/admin/AdminPermsMatrixTab.vue";
import AdminLabelSourcesTab from "@/components/admin/AdminLabelSourcesTab.vue";

interface DsfrTab {
  title: string;
  icon?: string;
  tabId: string;
  panelId: string;
  component: any;
}

const activeTab = ref(0);
const tabs = ref<DsfrTab[]>([
  {
    title: "Gestion des utilisateurs",
    icon: "ri-user-settings-line",
    tabId: "tab-users",
    panelId: "panel-users",
    component: AdminUsersTab,
  },
  {
    title: "Gestions des tags",
    icon: "ri-price-tag-line",
    tabId: "tab-tags",
    panelId: "panel-tags",
    component: AdminTagsTab,
  },
  {
    title: "Gestions des sources",
    icon: "ri-database-2-line",
    tabId: "tab-label-sources",
    panelId: "panel-label-sources",
    component: AdminLabelSourcesTab,
  },
  {
    title: "Indice de qualité",
    icon: "ri-bar-chart-line",
    tabId: "tab-quality",
    panelId: "panel-quality",
    component: AdminQualityTab,
  },
  {
    title: "Matrice des permissions",
    icon: "ri-shield-user-line",
    tabId: "tab-app-perms-matrix",
    panelId: "panel-app-perms-matrix",
    component: AdminPermsMatrixTab,
  },
]);
</script>

<template>
  <DsfrTabs v-model="activeTab" tab-list-name="Administration" :tab-titles="tabs" data-testid="admin-tabs">
    <template v-for="(tab, index) in tabs" :key="tab.panelId">
      <KeepAlive>
        <DsfrTabContent
          v-if="activeTab === index"
          :panel-id="tab.panelId"
          :tab-id="tab.tabId"
          :title="`Onglet ${tab.title}`"
          :aria-label="`Onglet ${tab.title}`"
          :data-testid="tab.panelId"
        >
          <component :is="tab.component" />
        </DsfrTabContent>
      </KeepAlive>
    </template>
  </DsfrTabs>
</template>
