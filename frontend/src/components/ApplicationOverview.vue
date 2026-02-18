<script setup lang="ts">
import { ref, watch, onMounted, onBeforeMount, computed } from "vue";
import type { Component } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useBreakpoints } from "@/composables/use-breakpoint";
import type { APP_PERMISSIONS, CreateApplicationWithPerms } from "@/models/Application";

import InformationsGenerales from "./InformationsGenerales.vue";
import Links from "./LinksTab.vue";
import StatusTab from "./StatusTab.vue";
import CompliancesAccordionManager from "./compliances/CompliancesAccordionManager.vue";
import ActorManager from "./actor/ActorTab.vue";
import Relationships from "./RelationshipsTab.vue";
import NotificationsApplication from "./NotificationsApplication.vue";
import Quality from "./QualityTab.vue";

import { useActorStore } from "@/stores/actorStore";
import { useHostingStore } from "@/stores/hostingStore";
import { useReportStore } from "@/stores/reportStore";
import type { Tab } from "@/utils/types";
import { useLinkStore } from "@/stores/linkStore";
import { useComplianceStore } from "@/stores/complianceStore";
import { useRelationStore } from "@/stores/relationStore";
import { useUserStore } from "@/stores/userStore";
import { AdminLevel } from "@/models/user";
import { useMetadataStore } from "@/stores/metadataStore";
import { BREAKPOINTS } from "@/constants/breakpoint";

const props = defineProps<{ application: CreateApplicationWithPerms }>();
const emit = defineEmits<{
  (e: "update:application"): void;
  (e: "errorMessage", message: string): void;
}>();
const hostingStore = useHostingStore();
const userStore = useUserStore();
const actorStore = useActorStore();
const linkStore = useLinkStore();
const compliancesStore = useComplianceStore();
const reportStore = useReportStore();
const relationsStore = useRelationStore();
const metadataStore = useMetadataStore();

// Local reactive state
const application = ref<CreateApplicationWithPerms>(props.application);
const activeTab = ref(0);
const route = useRoute();
const router = useRouter();

const breakpoints = useBreakpoints({ mobile: BREAKPOINTS.MOBILE_MAX });
const isMobile = breakpoints.smaller("mobile");

function updateApplication() {
  emit("update:application");
}

const errorMessages = {
  ERR_LOAD_HOSTINGS: "Erreur lors du chargement des hébergements",
  ERR_LOAD_ACTORS: "Erreur lors du chargement des acteurs",
  ERR_LOAD_ISSUES_METADATAS: "Erreur lors du chargement des signalements et modifications",
  ERR_LOAD_LINKS: "Erreur lors du chargement des liens",
  ERR_LOAD_RELATIONS: "Erreur lors du chargement des relations",
  ERR_LOAD_COMPLIANCES: "Erreur lors du chargement des conformités",
} as const;

const fetchLinks = () => linkStore.fetchLinks(application.value.id);
const fetchCompliances = () => compliancesStore.fetchCompliance(application.value.id);
const fetchActors = () => actorStore.fetchActorsByApplication(application.value.id);
const fetchRelations = () => relationsStore.fetchRelationsByApplication(application.value.id);

async function fetchHistoryData() {
  if (application.value.myPerms.has("readMetadata") || userStore.adminLevel >= AdminLevel.READ) {
    await metadataStore.fetchMetadatasByApplication(application.value.id, {
      page: 0,
      pageSize: 20,
      sortBy: "createdAt",
      order: "desc",
    });
  }
}

// Tabs definition — keep the same shape, but ensure errorKey is keyof errorMessages
const tabs = ref<
  (Tab<typeof errorMessages> & {
    component: Component;
    requiredPerms: APP_PERMISSIONS[];
    errorKey?: keyof typeof errorMessages;
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
    title: "Statuts",
    icon: "ri-time-line",
    tabId: "tab-statuses",
    panelId: "panel-statuses",
    component: StatusTab,
    requiredPerms: ["readBase"],
  },
  {
    title: "Historique",
    icon: "ri-edit-line",
    tabId: "tab-history",
    panelId: "panel-history",
    component: NotificationsApplication,
    requiredPerms: [],
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

// Read tab from URL using tabId (string) — more stable than using numeric index
onMounted(() => {
  const raw = Array.isArray(route.query.tab) ? route.query.tab[0] : route.query.tab;
  if (raw) {
    const idx = tabs.value.findIndex((t) => t.tabId === raw);
    if (idx !== -1) activeTab.value = idx;
  }
});

onBeforeMount(async () => {
  // filter tabs based on permissions
  tabs.value = tabs.value.filter((tab) => {
    if (!tab.requiredPerms) return true;
    if (userStore.adminLevel >= AdminLevel.READ) return true;
    return tab.requiredPerms.every((perm) => props.application.myPerms.has(perm));
  });

  // clamp activeTab to valid range
  if (activeTab.value >= tabs.value.length) activeTab.value = Math.max(0, tabs.value.length - 1);

  // trigger load functions (they use application.value internally)
  tabs.value.forEach((tab) => {
    if (tab.loadFn) {
      // call and handle error per-tab
      tab.loadFn().catch((err: unknown) => {
        console.error(`Error loading ${tab.title}:`, err);
        const msg = tab.errorKey ? errorMessages[tab.errorKey] : "Erreur de chargement";
        emit("errorMessage", msg);
      });
    }
  });

  // fetch hostings if allowed
  if (userStore.adminLevel >= AdminLevel.READ || props.application.myPerms.has("readHostings")) {
    hostingStore.fetchHostings(application.value.id).catch(() => {
      emit("errorMessage", errorMessages.ERR_LOAD_HOSTINGS);
    });
  }
});

// keep props -> local ref in sync
watch(
  () => props.application,
  (newVal) => {
    application.value = newVal;
  },
);

// write tabId (not index) to URL to keep it stable
watch(
  () => activeTab.value,
  (newIdx) => {
    const tabId = tabs.value[newIdx]?.tabId;
    if (tabId) router.replace({ query: { ...route.query, tab: tabId } });
  },
);
</script>

<template>
  <DsfrTabs
    v-if="!isMobile"
    v-model="activeTab"
    tab-list-name="Informations sur l'application"
    :tab-titles="tabs"
    data-testid="application-tabs"
  >
    <template v-for="(tab, index) in tabs" :key="tab.panelId">
      <DsfrTabContent :tab-id="tab.tabId" :panel-id="tab.panelId" :data-testid="`application-tab-content-${tab.tabId}`">
        <!-- lazy mount the component to avoid mounting heavy components until the tab is active -->
        <KeepAlive>
          <component
            v-if="activeTab === index"
            :is="tab.component"
            :application="application"
            :data-testid="`application-tab-component-${tab.tabId}`"
            @update:application="updateApplication"
          />
        </KeepAlive>
      </DsfrTabContent>
    </template>
  </DsfrTabs>

  <div v-else class="fr-accordions-group">
    <h2 class="fr-h4 fr-mb-2w">Informations sur l'application</h2>
    <!--
      Note: lazy mounting inside the DSFR accordion depends on the exact API of `DsfrAccordion`.
      Here we keep behavior similar to your previous code (mounting the component inside the accordion).
      If `DsfrAccordion` exposes an expanded state or events, we can mount the inner component only
      when its accordion is opened to reduce initial render cost on mobile.
    -->
    <DsfrAccordion v-for="(tab, index) in tabs" :key="tab.tabId" :title="tab.title" :id="`accordion-${tab.panelId}`">
      <component
        :is="tab.component"
        :application="application"
        :data-testid="`application-tab-component-${tab.tabId}`"
        :is-mobile="isMobile"
        @update:application="updateApplication"
      />
    </DsfrAccordion>
  </div>
</template>
