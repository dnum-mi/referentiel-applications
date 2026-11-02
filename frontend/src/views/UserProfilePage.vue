<script setup lang="ts">
import { Permission } from "@/client/types.gen";
import UserFollowTab from "@/components/users/UsrFollowTab.vue";
import UserGristSettings from "@/components/users/UserGristSettings.vue";
import UserInfoTab from "@/components/users/UserInfoTab.vue";
import UserTokensTab from "@/components/users/UserTokensTab.vue";
import { useUserStore } from "@/stores/userStore";
import { computed, nextTick, ref, useTemplateRef, watch } from "vue";
import { useRoute } from "vue-router";

const userStore = useUserStore();
const activeTab = ref(0);
const route = useRoute();
watch(
  () => route.query.tab,
  (tab) => {
    if (tab === "tokens") activeTab.value = 1;
  },
  { immediate: true },
);
const profileRoot = useTemplateRef<HTMLElement>("profileRoot");

// Onglet réservé aux utilisateurs qui peuvent synchroniser avec Grist ; placé en dernier pour ne pas
// décaler l'index des autres onglets.
const hasGristSync = computed(() => userStore.hasPermissions([Permission.GRIST_SYNC]));

const tabDefinitions = [
  {
    tabId: "informations",
    title: "Mes informations",
    panelId: "tab-content-informations",
  },
  {
    tabId: "tokens",
    title: "Mes tokens",
    panelId: "tab-content-tokens",
  },
  {
    tabId: "follow",
    title: "Mes abonnements",
    panelId: "tab-content-followapp",
  },
  {
    tabId: "grist",
    title: "Synchronisation Grist",
    panelId: "tab-content-grist",
  },
];
const tabs = computed(() => tabDefinitions.filter((tab) => hasGristSync.value || tab.tabId !== "grist"));

watch(hasGristSync, async () => {
  if (activeTab.value < tabs.value.length) return;

  const focusedElement = document.activeElement;
  const focusIsRemoved =
    !!focusedElement &&
    (profileRoot.value?.querySelector("#grist")?.contains(focusedElement) ||
      profileRoot.value?.querySelector("#tab-content-grist")?.contains(focusedElement));

  activeTab.value = 0;
  await nextTick();
  const firstTab = profileRoot.value?.querySelector<HTMLElement>("#informations");

  // DSFR focalise l'onglet sélectionné : ne conserver ce déplacement que si le focus a disparu.
  if (!focusIsRemoved) {
    if (document.activeElement === firstTab && focusedElement !== firstTab) {
      if (focusedElement === document.body) firstTab?.blur();
      else if (focusedElement instanceof HTMLElement && focusedElement.isConnected) focusedElement.focus();
    }
    return;
  }

  if (document.activeElement !== document.body && document.activeElement !== focusedElement) return;
  firstTab?.focus();
});
</script>

<template>
  <div ref="profileRoot" class="fr-container" data-testid="user-profile">
    <div class="fr-grid-row">
      <div class="fr-col-12">
        <h1 class="fr-mb-4w" data-testid="user-profile-main-title">Profil utilisateur</h1>

        <DsfrTabs
          v-model="activeTab"
          class="profile-tabs"
          tab-list-name="Profil utilisateur"
          :tab-titles="tabs"
          data-testid="user-profile-tabs"
        >
          <!-- Le registre DSFR garde les mêmes items ; seul Grist autorisé entre dans les déplacements clavier. -->
          <template #tab-items>
            <DsfrTabItem
              v-for="(tab, index) in tabDefinitions"
              :key="tab.tabId"
              v-show="tab.tabId !== 'grist' || hasGristSync"
              :hidden="tab.tabId === 'grist' && !hasGristSync"
              :tab-id="tab.tabId"
              :panel-id="tab.panelId"
              @click="activeTab = index"
              @next="activeTab = (activeTab + 1) % tabs.length"
              @previous="activeTab = (activeTab + tabs.length - 1) % tabs.length"
              @first="activeTab = 0"
              @last="activeTab = tabs.length - 1"
            >
              {{ tab.title }}
            </DsfrTabItem>
          </template>
          <DsfrTabContent tab-id="informations" panel-id="tab-content-informations" data-testid="user-profile-tab-informations">
            <UserInfoTab />
          </DsfrTabContent>

          <DsfrTabContent tab-id="tokens" panel-id="tab-content-tokens" data-testid="user-profile-tab-tokens">
            <UserTokensTab />
          </DsfrTabContent>
          <DsfrTabContent tab-id="follow" panel-id="tab-content-followapp" data-testid="user-profile-tab-follow">
            <UserFollowTab />
          </DsfrTabContent>
          <DsfrTabContent v-if="hasGristSync" tab-id="grist" panel-id="tab-content-grist" data-testid="user-profile-tab-grist">
            <UserGristSettings />
          </DsfrTabContent>
        </DsfrTabs>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-tabs {
  /* Le focus d'un formulaire ne doit pas faire défiler le conteneur pendant son redimensionnement. */
  overflow: clip;
}
</style>
