<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { Application } from "@/models/Application";

import InformationsGenerales from "./InformationsGenerales.vue";
import Links from "./LinksTab.vue";
import Compliances from "./CompliancesTab.vue";
import ActorManager from "./actor/ActorTab.vue";
import Relationships from "./RelationshipsTab.vue";
import NotificationsApplication from "./NotificationsApplication.vue";
import Quality from "./QualityTab.vue";

const props = defineProps<{ application: Application }>();
const emit = defineEmits(["update:application"]);

const application = ref(props.application);
const activeTab = ref(0);
const route = useRoute();
const router = useRouter();

const updateApplication = (updatedApp: Application) => {
  Object.assign(application.value, updatedApp);
  emit("update:application", updatedApp);
};

const tabs = [
  {
    title: "Informations générales",
    icon: "ri-checkbox-circle-line",
    tabId: "tab-infos",
    panelId: "panel-infos",
    component: InformationsGenerales,
  },
  {
    title: "Liens",
    icon: "ri-links-line",
    tabId: "tab-links",
    panelId: "panel-links",
    component: Links,
  },
  {
    title: "Conformités",
    icon: "ri-shield-check-line",
    tabId: "tab-compliances",
    panelId: "panel-compliances",
    component: Compliances,
  },
  {
    title: "Acteurs",
    icon: "ri-team-line",
    tabId: "tab-actors",
    panelId: "panel-actors",
    component: ActorManager,
  },
  {
    title: "Relations",
    icon: "ri-node-tree",
    tabId: "tab-relations",
    panelId: "panel-relations",
    component: Relationships,
  },
  {
    title: "Historiques",
    icon: "ri-edit-line",
    tabId: "tab-history",
    panelId: "panel-history",
    component: NotificationsApplication,
  },
  {
    title: "Qualité",
    icon: "ri-bar-chart-line",
    tabId: "tab-quality",
    panelId: "panel-quality",
    component: Quality,
  },
];

onMounted(() => {
  const tabParam = route.query.tab;
  if (tabParam && !isNaN(Number(tabParam))) {
    const index = Number(tabParam);
    if (index >= 0 && index < tabs.length) {
      activeTab.value = index;
    }
  }
});

watch(
  () => props.application,
  (newVal) => {
    application.value = newVal;
  },
);

watch(
  () => activeTab.value,
  (newVal) => {
    router.replace({ query: { ...route.query, tab: newVal.toString() } });
  },
);
</script>

<template>
  <DsfrTabs v-model="activeTab" tab-list-name="Informations sur l'application" :tab-titles="tabs">
    <template v-for="(tab, index) in tabs" :key="tab.panelId">
      <DsfrTabContent :tab-id="tab.tabId" :panel-id="tab.panelId" v-show="activeTab === index">
        <component :is="tab.component" :application="application" @update:application="updateApplication" />
      </DsfrTabContent>
    </template>
  </DsfrTabs>
</template>
