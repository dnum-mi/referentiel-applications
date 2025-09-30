<script setup lang="ts">
import { ref } from "vue";
import allIssues from "@/components/Issue/AllIssues.vue";
import MyIssues from "@/components/Issue/MyIssues.vue";

const activeTab = ref(0);
const applicationTabListName = "Informations sur les signalements";

const tabs = [
  {
    title: "Mes Signalements",
    icon: "ri-edit-line",
    tabId: "tab-my-issues",
    panelId: "panel-my-issues",
    component: MyIssues,
  },
  {
    title: "Tous les Signalements",
    icon: "ri-edit-line",
    tabId: "tab-all-issues",
    panelId: "panel-all-issues",
    component: allIssues,
  },
];
</script>

<template>
  <div data-testid="issue-page">
    <h1 class="fr-h1" data-testid="issue-page-title">
      Signalements
    </h1>
    <DsfrTabs v-model="activeTab" :tab-list-name="applicationTabListName" :tab-titles="tabs" data-testid="issues-tabs">
      <template v-for="(tab, index) in tabs" :key="tab.panelId">
        <DsfrTabContent v-show="activeTab === index" :tab-id="tab.tabId" :panel-id="tab.panelId" :data-testid="`issues-tab-content-${tab.tabId}`">
          <component :is="tab.component" :data-testid="`issues-tab-component-${tab.tabId}`" />
        </DsfrTabContent>
      </template>
    </DsfrTabs>
  </div>
</template>
