<script setup lang="ts">
import { useUserStore } from "@/stores/userStore";
import { ref, onMounted, nextTick, useTemplateRef } from "vue";

const userStore = useUserStore();
const isUpdating = ref(false);
const emailNotificationsEnabled = ref(true);
const successMessage = ref("");
const errorMessage = ref("");
const toggleRef = useTemplateRef<{ $el?: HTMLElement } | null>("toggleRef");

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
    // 12.8 : conserver le focus sur le champ après l'opération (le :disabled le retire pendant la requête).
    await nextTick();
    toggleRef.value?.$el?.querySelector("input")?.focus();
  }
}

onMounted(async () => {
  await userStore.fetchUser();
});
</script>

<template>
  <div v-if="userStore.user" class="fr-mt-3w" data-testid="user-profile-card">
    <!-- RGAA-072 : tableau clé/valeur à en-têtes de ligne, sans <thead> vide → table native dans le conteneur DSFR. -->
    <div class="fr-table" data-testid="user-profile-table">
      <table>
        <caption class="fr-sr-only">
          Informations personnelles
        </caption>
        <tbody>
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
        </tbody>
      </table>
    </div>
    <div class="fr-mt-4w">
      <UserPermissions :user="userStore.user" />
    </div>
    <div class="fr-mt-4w">
      <h2 class="fr-h6">Préférences de notification</h2>
      <DsfrToggleSwitch
        ref="toggleRef"
        v-model="emailNotificationsEnabled"
        label="Recevoir les notifications par email"
        aria-label="Recevoir des notifications par email lorsque des changements sont apportés à vos applications suivies."
        data-testid="user-profile-email-notifications-checkbox"
        :disabled="isUpdating"
        @update:model-value="handleToggleEmailNotifications"
      />
    </div>
  </div>
</template>
