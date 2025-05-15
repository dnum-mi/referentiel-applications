<script setup lang="ts">
import type { Application } from "@/models/Application";
import { ref, watch, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
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
const router = useRouter();
const route = useRoute();

watch(
  () => props.application,
  (newVal) => {
    application.value = newVal;
  },
);

// Watch for changes to the activeTab and update the URL
watch(
  () => activeTab.value,
  (newTab) => {
    router.replace({
      query: { ...route.query, tab: newTab.toString() },
    });
  },
);

onMounted(() => {
  // Read the tab from URL on component mount
  const tabParam = route.query.tab;
  if (tabParam && !isNaN(Number(tabParam))) {
    const tabIndex = Number(tabParam);
    if (tabIndex >= 0 && tabIndex < tabs.length) {
      activeTab.value = tabIndex;
    }
  }
});

const updateApplication = (updatedApp: Application) => {
  Object.assign(application.value, updatedApp);
};

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
  <DsfrTabs v-model="activeTab" tab-list-name="Informations sur l'application">
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
