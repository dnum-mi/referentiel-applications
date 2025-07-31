<script setup lang="ts">
import { ref, watch, onMounted, onBeforeMount, type Component } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { APP_PERMISSIONS, ApplicationWithPerms } from "@/models/Application";

import InformationsGenerales from "./InformationsGenerales.vue";
import Links from "./LinksTab.vue";
import CompliancesAccordionManager from "./compliances/CompliancesAccordionManager.vue";
import ActorManager from "./actor/ActorTab.vue";
import Relationships from "./RelationshipsTab.vue";
import NotificationsApplication from "./NotificationsApplication.vue";
import Quality from "./QualityTab.vue";
import { useActorStore } from "@/stores/actorStore";
import { useHostingStore } from "@/stores/hostingStore";
import { useReportIssueStore } from "@/stores/reportIssueStore";
import type { Tab } from "@/utils/types";
import { useLinkStore } from "@/stores/linkStore";
import { useComplianceStore } from "@/stores/complianceStore";
import { useRelationStore } from "@/stores/relationStore";
import { useUserStore } from "@/stores/userStore";
import useToaster from "@/composables/use-toaster";
import { AdminLevel } from "@/models/user";
import { useMetadataStore } from "@/stores/metadataStore";

const props = defineProps<{ application: ApplicationWithPerms }>();
const emit = defineEmits(["update:application"]);
const hostingStore = useHostingStore();
const userStore = useUserStore();
const actorStore = useActorStore();
const linkStore = useLinkStore();
const compliancesStore = useComplianceStore();
const reportIssueStore = useReportIssueStore();
const relationsStore = useRelationStore();
const metadataStore = useMetadataStore();

const application = ref<ApplicationWithPerms>(props.application);
const activeTab = ref(0);
const route = useRoute();
const router = useRouter();
const toaster = useToaster();

const updateApplication = (updatedApp: ApplicationWithPerms) => {
  Object.assign(application.value, updatedApp);
  emit("update:application", updatedApp);
};

const errorMessages = {
  ERR_LOAD_HOSTINGS: "Erreur lors du chargement des hébergements",
  ERR_LOAD_ACTORS: "Erreur lors du chargement des acteurs",
  ERR_LOAD_ISSUES_METADATAS: "Erreur lors du chargement des signalements et modifications",
  ERR_LOAD_LINKS: "Erreur lors du chargement des liens",
  ERR_LOAD_RELATIONS: "Erreur lors du chargement des relations",
  ERR_LOAD_COMPLIANCES: "Erreur lors du chargement des conformités",
};

const fetchLinks = linkStore.fetchLinks.bind(linkStore, props.application.id);
const fetchCompliances = compliancesStore.fetchCompliance.bind(compliancesStore, props.application.id);
const fetchActors = actorStore.fetchActorsByApplication.bind(actorStore, props.application.id);
const fetchRelations = relationsStore.fetchRelationsByApplication.bind(relationsStore, props.application.id);
const fetchHistoryData = async () => {
  await Promise.all([
    reportIssueStore.fetchIssueByApplication(props.application.id),
    metadataStore.fetchMetadatasByApplication(props.application.id),
  ]);
};

const tabs = ref<
  (Tab<typeof errorMessages> & {
    component: Component;
    requiredPerms: APP_PERMISSIONS[];
  })[]
>([
  {
    title: "Informations générales",
    icon: "ri-checkbox-circle-line",
    tabId: "tab-infos",
    panelId: "panel-infos",
    component: InformationsGenerales,
    requiredPerms: ["readBase"],
  },
  {
    title: "Liens",
    icon: "ri-links-line",
    tabId: "tab-links",
    panelId: "panel-links",
    component: Links,
    requiredPerms: ["readLinks"],
    loadFn: fetchLinks,
    errorKey: "ERR_LOAD_LINKS",
  },
  {
    title: "Conformités",
    icon: "ri-shield-check-line",
    tabId: "tab-compliances",
    panelId: "panel-compliances",
    component: CompliancesAccordionManager,
    requiredPerms: ["readCompliances"],
    loadFn: fetchCompliances,
    errorKey: "ERR_LOAD_COMPLIANCES",
  },
  {
    title: "Acteurs",
    icon: "ri-team-line",
    tabId: "tab-actors",
    panelId: "panel-actors",
    component: ActorManager,
    requiredPerms: ["readActors"],
    loadFn: fetchActors,
    errorKey: "ERR_LOAD_ACTORS",
  },
  {
    title: "Relations",
    icon: "ri-node-tree",
    tabId: "tab-relations",
    panelId: "panel-relations",
    component: Relationships,
    requiredPerms: ["readRelations"],
    loadFn: fetchRelations,
    errorKey: "ERR_LOAD_RELATIONS",
  },
  {
    title: "Historique",
    icon: "ri-edit-line",
    tabId: "tab-history",
    panelId: "panel-history",
    component: NotificationsApplication,
    requiredPerms: ["readMetadata"],
    loadFn: fetchHistoryData,
    errorKey: "ERR_LOAD_ISSUES_METADATAS",
  },
  {
    title: "Qualité",
    icon: "ri-bar-chart-line",
    tabId: "tab-quality",
    panelId: "panel-quality",
    component: Quality,
    requiredPerms: ["readCompliances", "readActors", "readLinks", "readBase"],
  },
]);

onMounted(() => {
  const tabParam = route.query.tab;
  if (tabParam && !isNaN(Number(tabParam))) {
    const index = Number(tabParam);
    if (index >= 0 && index < tabs.value.length) {
      activeTab.value = index;
    }
  }
});

onBeforeMount(async () => {
  tabs.value = tabs.value.filter((tab) => {
    if (!tab.requiredPerms) return true;
    if (userStore.adminLevel >= AdminLevel.READ) return true;
    return tab.requiredPerms.every((perm) => props.application.myPerms.has(perm));
  });
  tabs.value.forEach((tab) => {
    if (tab.loadFn) {
      tab.loadFn().catch((err) => {
        console.error(`Error loading ${tab.title}:`, err);
        toaster.addErrorMessage(errorMessages[tab.errorKey]);
      });
    }
  });
  if (userStore.adminLevel >= AdminLevel.READ || props.application.myPerms.has("readHostings")) {
    hostingStore.fetchHostings(props.application.id).catch(() => {
      toaster.addErrorMessage(errorMessages.ERR_LOAD_HOSTINGS);
    });
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
