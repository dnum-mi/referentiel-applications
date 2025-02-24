<script setup lang="ts">
import { ref, watch } from "vue";
import InformationsGenerales from "./InformationsGenerales.vue";
import NotificationsApplication from "./NotificationsApplication.vue";
import Links from "./Links.vue";
import ActorManager from "./ActorManager.vue";
import Compliances from "./Compliances.vue";
import type { Application } from "@/models/Application";
import Applications from "@/api/application";

const props = defineProps<{ application: Application }>();
const emit = defineEmits(["update:application"]);
const application = ref<Application>(props.application);
const activeTab = ref(0);

watch(
  () => props.application,
  (newVal) => {
    application.value = newVal;
  },
);

const updateApplication = (updatedApp: Application) => {
  Object.assign(application.value, updatedApp);
  console.log(updatedApp);
};

const applicationTabListName = "Informations sur l’application";
const tabTitles = [
  { title: "Informations générales", icon: "ri-checkbox-circle-line", tabId: "tab-0", panelId: "tab-content-0" },
  {
    title: "Liens",
    icon: "ri-links-line",
    tabId: "tab-1",
    panelId: "tab-content-1",
  },
  {
    title: "Conformités",
    icon: "ri-shield-check-line",
    tabId: "tab-2",
    panelId: "tab-content-2",
  },
  {
    title: "Acteurs",
    icon: "ri-team-line",
    tabId: "tab-3",
    panelId: "tab-content-3",
  },
  { title: "Signalements", icon: "ri-alert-line", tabId: "tab-4", panelId: "tab-content-4" },
];
</script>
<template>
  <DsfrTabs v-model="activeTab" :tab-list-name="applicationTabListName">
    <template #tab-items>
      <DsfrTabItem
        v-for="(tab, index) in tabTitles"
        :key="tab.tabId"
        :tab-id="tab.tabId"
        :panel-id="tab.panelId"
        :icon="tab.icon"
        @click="activeTab = index"
      >
        {{ tab.title }}
      </DsfrTabItem>
    </template>

    <DsfrTabContent v-if="activeTab === 0" panel-id="tab-content-0" tab-id="tab-0">
      <InformationsGenerales :application="application" @update:application="updateApplication" />
    </DsfrTabContent>

    <DsfrTabContent v-if="activeTab === 1" panel-id="tab-content-1" tab-id="tab-1">
      <Links :application="application" @update:application="updateApplication" />
    </DsfrTabContent>

    <DsfrTabContent v-if="activeTab === 2" panel-id="tab-content-2" tab-id="tab-2">
      <Compliances :application="application" @update:application="updateApplication" />
    </DsfrTabContent>

    <DsfrTabContent v-if="activeTab === 3" panel-id="tab-content-3" tab-id="tab-3">
      <ActorManager :application="application" />
    </DsfrTabContent>

    <DsfrTabContent v-if="activeTab === 4" panel-id="tab-content-4" tab-id="tab-4">
      <NotificationsApplication :application="application" />
    </DsfrTabContent>
  </DsfrTabs>
</template>
