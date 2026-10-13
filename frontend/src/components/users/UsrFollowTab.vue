<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";
import { useUserStore } from "@/stores/userStore";

const userStore = useUserStore();

const isUpdating = ref(false);
const successMessage = ref("");
const errorMessage = ref("");
const followedSection = ref<HTMLElement | null>(null);
const followedTitle = ref<HTMLElement | null>(null);

onMounted(async () => {
  await userStore.fetchUser();
});

const unsubscribe = async (appId: string) => {
  if (isUpdating.value) return;
  const focusOrigin = document.activeElement;
  const userId = userStore.user?.id;
  const applicationIndex = userStore.user?.followedApplications?.findIndex((app) => app.id === appId) ?? 0;
  const applicationLabel = userStore.user?.followedApplications?.find((app) => app.id === appId)?.label || appId;
  isUpdating.value = true;
  successMessage.value = "";
  errorMessage.value = "";

  try {
    await userStore.unsubscribeFromApp(appId);
    if (userId !== userStore.user?.id) return;
    await userStore.fetchUser();
    if (userId !== userStore.user?.id) return;
    successMessage.value = `Vous avez été désabonné(e) de l’application ${applicationLabel}.`;
  } catch (err) {
    if (userId !== userStore.user?.id) return;
    console.error("Erreur lors du désabonnement :", err);
    errorMessage.value = "Erreur lors du désabonnement. Veuillez réessayer.";
  } finally {
    isUpdating.value = false;
    await nextTick();
    if (userId === userStore.user?.id && (document.activeElement === document.body || document.activeElement === focusOrigin)) {
      const buttons = Array.from(
        followedSection.value?.querySelectorAll<HTMLButtonElement>('[data-testid="user-unsubscribe-button"]') || [],
      );
      const previousButton = buttons.find((button) => button.dataset.applicationId === appId);
      (previousButton || buttons[applicationIndex] || buttons.at(-1) || followedTitle.value)?.focus();
    }
  }
};
</script>

<template>
  <div v-if="userStore.user" ref="followedSection" class="fr-mt-3w" data-testid="user-profile-card">
    <!-- RGAA-081 : tableau de mise en forme (nom + bouton) → role="presentation", titre en <h2>, sans th/thead/scope/caption. -->
    <div data-testid="user-followed-apps-table">
      <h2 ref="followedTitle" class="fr-h5" tabindex="-1">Applications suivies</h2>
      <table role="presentation" class="fr-table">
        <tbody>
          <tr v-if="userStore.user.followedApplications?.length === 0">
            <td colspan="2">Aucune application suivie</td>
          </tr>

          <tr v-for="app in userStore.user.followedApplications" :key="app.id" class="fr-mb-1w">
            <td style="width: 100%">
              <RouterLink :to="{ name: 'application', params: { id: app.id } }" class="fr-link">
                {{ app.label }}
              </RouterLink>
            </td>
            <td style="white-space: nowrap">
              <DsfrButton
                class="fr-btn--secondary fr-btn--sm"
                :disabled="isUpdating"
                @click="unsubscribe(app.id)"
                :title="`Désabonner de l’application ${app.label}`"
                :aria-label="`Désabonner de l’application ${app.label}`"
                :data-application-id="app.id"
                data-testid="user-unsubscribe-button"
              >
                Désabonner
              </DsfrButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <output
      aria-live="polite"
      aria-atomic="true"
      :class="successMessage ? 'fr-alert fr-alert--success fr-mt-2w' : ''"
      class="follow-status"
    >
      {{ isUpdating ? "Désabonnement en cours…" : successMessage }}
    </output>

    <div v-if="errorMessage" class="fr-mt-2w">
      <div class="fr-alert fr-alert--error" role="alert">
        {{ errorMessage }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.follow-status {
  display: block;
  font-size: 1rem;
  line-height: 1.5rem;
  margin: var(--text-spacing);
}
</style>
