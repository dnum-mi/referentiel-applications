<script setup lang="ts">
import UserInfoTab from "@/components/users/UserInfoTab.vue";
import UserTokensTab from "@/components/users/UserTokensTab.vue";
import { ref, onMounted } from "vue";
import { useUserStore } from "@/stores/userStore";

const userStore = useUserStore();
const isUpdating = ref(false);
const emailNotificationsEnabled = ref(true);
const successMessage = ref("");
const errorMessage = ref("");

onMounted(async () => {
  await userStore.fetchUser();
  if (userStore.user) {
    emailNotificationsEnabled.value = userStore.user.emailNotificationsEnabled ?? true;
  }
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

async function handleToggleEmailNotifications() {
  
  isUpdating.value = true;
  successMessage.value = "";
  errorMessage.value = "";
  
  const SUCCESS_MESSAGE_TIMEOUT = 3000;

    try {
      await userStore.updateEmailPreferences(emailNotificationsEnabled.value);
      successMessage.value = "Vos préférences de notification ont été mises à jour avec succès.";
      
      setTimeout(() => {
        successMessage.value = "";
      }, SUCCESS_MESSAGE_TIMEOUT);
  } catch (error) {
    console.error("Error updating email preferences:", error);
    errorMessage.value = "Erreur lors de la mise à jour de vos préférences. Veuillez réessayer.";
    
    emailNotificationsEnabled.value = !emailNotificationsEnabled.value;
  } finally {
    isUpdating.value = false;
  }
}
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
         <div class="fr-mt-4w">
            <h2 class="fr-h6">Préférences de notification</h2>
            <DsfrToggleSwitch
              v-model="emailNotificationsEnabled"
              label="Recevoir les notifications par email"
              hint="Recevoir des notifications par email lorsque vous êtes ajouté ou modifié en tant qu'acteur dans une application"
              data-testid="user-profile-email-notifications-checkbox"
              :disabled="isUpdating"
              @update:model-value="handleToggleEmailNotifications"
            />
          </div>
      </div>
    </div>
  </div>
</template>
