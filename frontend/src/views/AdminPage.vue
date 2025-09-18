<script setup lang="ts">
import AdminUsersTab from "@/components/admin/AdminUsersTab.vue";
import AdminQualityTab from "@/components/admin/AdminQualityTab.vue";
import { ref } from "vue";
import AdminPermsMatrixTab from "@/components/admin/AdminPermsMatrixTab.vue";

interface DsfrTab {
  title: string
  icon?: string
  tabId: string
  panelId: string
  component: any
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
      <DsfrTabContent
        v-show="activeTab === index"
        :panel-id="tab.panelId"
        :tab-id="tab.tabId"
        :data-testid="tab.panelId"
      >
        <component :is="tab.component" />
      </DsfrTabContent>
    </template>
  </DsfrTabs>
</template>
