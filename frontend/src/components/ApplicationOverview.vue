<script setup lang="ts">
import type { APP_PERMISSIONS, CreateApplicationWithPerms } from "@/models/Application";
import { routeNames } from "@/router/route-names";
import { useMediaQuery } from "@vueuse/core";
import type { Component } from "vue";
import { onBeforeMount, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import ActorManager from "./actor/ActorTab.vue";
import ApplicationMetadatasTab from "./ApplicationMetadatasTab.vue";
import ApplicationReportsTab from "./ApplicationReportsTab.vue";
import CompliancesAccordionManager from "./compliances/CompliancesAccordionManager.vue";
import InformationsGenerales from "./InformationsGenerales.vue";
import Links from "./LinksTab.vue";
import Quality from "./QualityTab.vue";
import Relationships from "./RelationshipsTab.vue";
import StatusTab from "./StatusTab.vue";

import { BREAKPOINTS } from "@/constants/breakpoint";
import { useUserStore } from "@/stores/userStore";
import type { Tab } from "@/utils/types";
import { Permission } from "@/client";

const props = defineProps<{ application: CreateApplicationWithPerms }>();
const emit = defineEmits<{
  (e: "update:application"): void;
  (e: "errorMessage", message: string): void;
}>();
const userStore = useUserStore();

// Local reactive state
const application = ref<CreateApplicationWithPerms>(props.application);
const activeTab = ref(0);
const route = useRoute();
const router = useRouter();

const isMobile = useMediaQuery(`(max-width: ${BREAKPOINTS.MOBILE_MAX}px)`);

function updateApplication() {
  emit("update:application");
}

// Tabs definition — keep the same shape, but ensure errorKey is keyof errorMessages
const tabs = ref<
  (Tab<{}> & {
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
    requiredPerms: [Permission.APP_READ],
  },
  {
    title: "Liens",
    icon: "ri-links-line",
    tabId: "tab-links",
    panelId: "panel-links",
    component: Links,
    requiredPerms: [Permission.LINK_READ],
  },
  {
    title: "Conformités",
    icon: "ri-shield-check-line",
    tabId: "tab-compliances",
    panelId: "panel-compliances",
    component: CompliancesAccordionManager,
    requiredPerms: [Permission.COMPLIANCE_READ],
  },
  {
    title: "Acteurs",
    icon: "ri-team-line",
    tabId: "tab-actors",
    panelId: "panel-actors",
    component: ActorManager,
    requiredPerms: [Permission.ACTOR_READ],
  },
  {
    title: "Relations",
    icon: "ri-node-tree",
    tabId: "tab-relations",
    panelId: "panel-relations",
    component: Relationships,
    requiredPerms: [Permission.RELATION_READ],
  },
  {
    title: "Statuts",
    icon: "ri-time-line",
    tabId: "tab-statuses",
    panelId: "panel-statuses",
    component: StatusTab,
    requiredPerms: [Permission.APP_READ],
  },
  {
    title: "Signalements",
    icon: "ri-edit-line",
    tabId: "tab-reports",
    panelId: "panel-reports",
    component: ApplicationReportsTab,
    requiredPerms: [],
  },
  {
    title: "Modifications",
    icon: "ri-file-list-2-line",
    tabId: "tab-modifications",
    panelId: "panel-modifications",
    component: ApplicationMetadatasTab,
    requiredPerms: [],
  },
  {
    title: "Qualité",
    icon: "ri-bar-chart-line",
    tabId: "tab-quality",
    panelId: "panel-quality",
    component: Quality,
    requiredPerms: [Permission.COMPLIANCE_READ, Permission.ACTOR_READ, Permission.LINK_READ, Permission.APP_READ],
  },
]);

// Read tab from URL using tabId (string) — more stable than using numeric index
onBeforeMount(async () => {
  // filter tabs based on permissions
  tabs.value = tabs.value.filter((tab) => {
    return userStore.hasPermissions(tab.requiredPerms, Array.from(props.application.myPerms));
  });

  // Read requested tab from URL params after filtering
  const raw = Array.isArray(route.params.tab) ? route.params.tab[0] : route.params.tab;
  if (raw) {
    const idx = tabs.value.findIndex((t) => t.tabId === raw);
    if (idx !== -1) activeTab.value = idx;
  }

  // clamp activeTab to valid range
  if (activeTab.value >= tabs.value.length) activeTab.value = Math.max(0, tabs.value.length - 1);
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
    if (tabId) {
      router.replace({
        name: routeNames.PROFILEAPP,
        params: { id: route.params.id, tab: tabId },
      });
    }
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
