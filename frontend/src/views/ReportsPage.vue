<script setup lang="ts">
import ReportsTab from "@/components/Report/ReportsTab.vue";
import { ref, markRaw } from "vue";

const activeTab = ref(0);
const applicationTabListName = "Informations sur les signalements";

const tabs = [
  {
    title: "Mes Signalements",
    icon: "ri-edit-line",
    tabId: "tab-my-reports",
    panelId: "panel-my-reports",
    allReport: false,
    component: markRaw(ReportsTab),
  },
  {
    title: "Tous les Signalements",
    icon: "ri-edit-line",
    tabId: "tab-all-reports",
    panelId: "panel-all-reports",
    allReport: true,
    component: markRaw(ReportsTab),
  },
];
</script>

<template>
  <div data-testid="reports-page">
    <h1 class="fr-h1" data-testid="reports-page-title">Signalements</h1>
    <DsfrTabs v-model="activeTab" :tab-list-name="applicationTabListName" :tab-titles="tabs" data-testid="reports-tabs">
      <template v-for="(tab, index) in tabs" :key="tab.panelId">
        <DsfrTabContent
          v-show="activeTab === index"
          :tab-id="tab.tabId"
          :panel-id="tab.panelId"
          :data-testid="`reports-tab-content-${tab.tabId}`"
        >
          <component :is="tab.component" :data-testid="`reports-tab-component-${tab.tabId}`" :is-active="activeTab === index" :all-report="tab.allReport" />
        </DsfrTabContent>
      </template>
    </DsfrTabs>
  </div>
</template>
