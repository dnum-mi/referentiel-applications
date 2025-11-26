<script setup lang="ts">
import UserInfoTab from "@/components/users/UserInfoTab.vue";
import UserTokensTab from "@/components/users/UserTokensTab.vue";
import { useUserStore } from "@/stores/userStore";

const userStore = useUserStore();

onMounted(() => {
  userStore.fetchUser();
});

const activeTab = ref(0);

const tabs = [
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
];
</script>

<template>
  <div class="fr-container" data-testid="user-profile">
    <div class="fr-grid-row">
      <div class="fr-col-12">
        <h1 class="fr-mb-4w" data-testid="user-profile-main-title">
          Profil utilisateur
        </h1>

        <DsfrTabs
          v-model="activeTab"
          tab-list-name="Profil utilisateur"
          :tab-titles="tabs"
          data-testid="user-profile-tabs"
        >
          <DsfrTabContent
            tab-id="informations"
            panel-id="tab-content-informations"
            data-testid="user-profile-tab-informations"
          >
            <UserInfoTab />
          </DsfrTabContent>

          <DsfrTabContent
            tab-id="tokens"
            panel-id="tab-content-tokens"
            data-testid="user-profile-tab-tokens"
          >
            <UserTokensTab />
          </DsfrTabContent>
        </DsfrTabs>
      </div>
    </div>
  </div>
</template>