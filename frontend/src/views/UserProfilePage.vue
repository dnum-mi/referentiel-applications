<script setup lang="ts">
import { Permission } from "@/client/types.gen";
import UserFollowTab from "@/components/users/UsrFollowTab.vue";
import UserGristSettings from "@/components/users/UserGristSettings.vue";
import UserInfoTab from "@/components/users/UserInfoTab.vue";
import UserTokensTab from "@/components/users/UserTokensTab.vue";
import { useUserStore } from "@/stores/userStore";
import { computed, nextTick, ref, useTemplateRef, watch } from "vue";

const userStore = useUserStore();
const activeTab = ref(0);
const profileRoot = useTemplateRef<HTMLElement>("profileRoot");

// Onglet réservé aux utilisateurs qui peuvent synchroniser avec Grist ; placé en dernier pour ne pas
// décaler l'index des autres onglets.
const hasGristSync = computed(() => userStore.hasPermissions([Permission.GRIST_SYNC]));

const tabs = computed(() => [
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
  ...(hasGristSync.value
    ? [
        {
          tabId: "grist",
          title: "Synchronisation Grist",
          panelId: "tab-content-grist",
        },
      ]
    : []),
]);

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

        <DsfrTabs v-model="activeTab" tab-list-name="Profil utilisateur" :tab-titles="tabs" data-testid="user-profile-tabs">
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
