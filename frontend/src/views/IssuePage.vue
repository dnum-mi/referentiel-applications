<script setup lang="ts">
import { ref } from "vue";
import allIssues from "@/components/AllIssues.vue";
import MyIssues from "@/components/MyIssues.vue";

const activeTab = ref(0);
const applicationTabListName = "Informations sur les signalements";
const tabs = [
  {
    title: "Mes signalements",
    icon: "ri-check-line",
    component: MyIssues,
  },
  {
    title: "Tous les signalements",
    icon: "ri-links-line",
    component: allIssues,
  },
];
</script>
<template>
  <DsfrTabs v-model="activeTab" :tab-list-name="applicationTabListName">
    <template #tab-items>
      <DsfrTabItem
        v-for="(tab, index) in tabs"
        :key="index"
        :tab-id="`tab-${index}`"
        :panel-id="`tab-content-${index}`"
        :icon="tab.icon"
        @click="activeTab = index"
      >
        {{ tab.title }}
      </DsfrTabItem>
    </template>

    <template v-for="(tab, index) in tabs" :key="tab.id">
      <DsfrTabContent v-show="activeTab === index" :panel-id="`tab-content-${index}`" :tab-id="`tab-${index}`">
        <component :is="tab.component" />
      </DsfrTabContent>
    </template>
  </DsfrTabs>
</template>
