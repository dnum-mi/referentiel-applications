<script setup lang="ts">
import type { Application } from "@/models/Application";
import { ref, watch } from "vue";
import ActorManager from "./actor/ActorTab.vue";
import Compliances from "./CompliancesTab.vue";
import Events from "./evenement/EventsTab.vue";
import InformationsGenerales from "./InformationsGenerales.vue";
import Links from "./LinksTab.vue";
import NotificationsApplication from "./NotificationsApplication.vue";
import Relationships from "./RelationshipsTab.vue";

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
};

const applicationTabListName = "Informations sur l’application";
const tabs = [
  { title: "Informations générales", icon: "ri-checkbox-circle-line", component: InformationsGenerales },
  {
    title: "Événements",
    icon: "ri-links-line",
    component: Events,
  },
  {
    title: "Liens",
    icon: "ri-links-line",
    component: Links,
  },
  {
    title: "Conformités",
    icon: "ri-shield-check-line",
    component: Compliances,
  },
  {
    title: "Acteurs",
    icon: "ri-team-line",
    component: ActorManager,
  },
  { title: "Relations", icon: "ri-node-tree", component: Relationships },

  { title: "Signalements", icon: "ri-alert-line", component: NotificationsApplication },
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

    <template v-for="(tab, index) in tabs" :key="index">
      <DsfrTabContent v-show="activeTab === index" :panel-id="`tab-content-${index}`" :tab-id="`tab-${index}`">
        <component :is="tab.component" :application="application" @update:application="updateApplication" />
      </DsfrTabContent>
    </template>
  </DsfrTabs>
</template>
