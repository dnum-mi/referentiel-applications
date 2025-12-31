<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useUserStore } from "@/stores/userStore";

const userStore = useUserStore();

const isUpdating = ref(false);
const successMessage = ref("");
const errorMessage = ref("");

const SUCCESS_MESSAGE_TIMEOUT = 3000;

onMounted(async () => {
  await userStore.fetchUser();
});

const unsubscribe = async (appId: string) => {
  isUpdating.value = true;
  successMessage.value = "";
  errorMessage.value = "";

  try {
    await userStore.unsubscribeFromApp(appId);
    await userStore.fetchUser();

    successMessage.value = "Vous avez été désabonné(e) de l'application.";
    setTimeout(() => {
      successMessage.value = "";
    }, SUCCESS_MESSAGE_TIMEOUT);
  } catch (err) {
    console.error("Erreur lors du désabonnement :", err);
    errorMessage.value = "Erreur lors du désabonnement. Veuillez réessayer.";
  } finally {
    isUpdating.value = false;
  }
};
</script>

<template>
  <div v-if="userStore.user" class="fr-mt-3w" data-testid="user-profile-card">
    <DsfrTable title="Applications suivies" data-testid="user-followed-apps-table">
      <template #default>
        <tr v-if="userStore.user.followedApplications?.length === 0">
          <td colspan="2">Aucune application suivie</td>
        </tr>

        <tr v-for="app in userStore.user.followedApplications" :key="app.id" class="fr-mb-1w">
          <th scope="row" style="width: 100%">
            <RouterLink :to="{ name: 'application', params: { id: app.id } }" class="fr-link">
              {{ app.label }}
            </RouterLink>
          </th>
          <td style="white-space: nowrap">
            <DsfrButton
              class="fr-btn--secondary fr-btn--sm"
              :disabled="isUpdating"
              @click="unsubscribe(app.id)"
              title="Ne plus suivre cette application"
              data-testid="user-unsubscribe-button"
            >
              Désabonner
            </DsfrButton>
          </td>
        </tr>
      </template>
    </DsfrTable>

    <div v-if="successMessage" class="fr-mt-2w">
      <div class="fr-alert fr-alert--success" role="status" aria-live="polite">
        {{ successMessage }}
      </div>
    </div>

    <div v-if="errorMessage" class="fr-mt-2w">
      <div class="fr-alert fr-alert--error" role="alert">
        {{ errorMessage }}
      </div>
    </div>
  </div>
</template>
