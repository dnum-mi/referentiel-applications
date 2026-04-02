<script setup lang="ts">
import { useUserStore } from "@/stores/userStore";
import { RolesWording, RolesWordingBadgeClass } from "@/utils/roles-utils";
import { ref, onMounted } from "vue";

const userStore = useUserStore();
const isUpdating = ref(false);
const emailNotificationsEnabled = ref(true);
const successMessage = ref("");
const errorMessage = ref("");

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

onMounted(async () => {
  await userStore.fetchUser();
});
</script>

<template>
  <div v-if="userStore.user" class="fr-mt-3w" data-testid="user-profile-card">
    <DsfrTable title="Informations personnelles" data-testid="user-profile-table">
      <tr>
        <th scope="row">Organisation</th>
        <td data-testid="user-profile-organization">
          {{ userStore.user.organization?.path || "Non renseignée" }}
        </td>
      </tr>
      <tr>
        <th scope="row">Email</th>
        <td data-testid="user-profile-email">
          {{ userStore.user.email }}
        </td>
      </tr>
    </DsfrTable>
    <div class="fr-mt-4w">
      <UserPermissions :user="userStore.user" />
    </div>
    <div class="fr-mt-4w">
      <h2 class="fr-h6">Préférences de notification</h2>
      <DsfrToggleSwitch
        v-model="emailNotificationsEnabled"
        label="Recevoir les notifications par email"
        hint="Recevoir des notifications par email lorsque des changements sont apportés à vos applications suivies."
        data-testid="user-profile-email-notifications-checkbox"
        :disabled="isUpdating"
        @update:model-value="handleToggleEmailNotifications"
      />
    </div>
  </div>
</template>
