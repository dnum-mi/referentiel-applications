<script setup lang="ts">
import type { AuthLevelConfigDto } from "@/client";
import { REAUTH_REDIRECT_FAILED_MESSAGE, reauthLoopState, weakAuthBannerText } from "@/composables/use-auth-level";
import { signinStrong } from "@/services/authentication";
import { getConfig } from "@/services/config";
import { useToasterStore } from "@/stores/toasterStore";
import { useUserStore } from "@/stores/userStore";
import { computed, onMounted, ref } from "vue";

// #1985 — Bandeau d'une session rétrogradée (sans carte agent ni double authentification).
// Non sticky et non fermable : un avertissement de sécurité ne se masque pas, mais il ne doit
// pas non plus se superposer au bandeau d'impersonation (sticky). Conditionné sur `downgraded`,
// jamais sur `level` : en mode observation le niveau peut être faible sans aucun effet.
const userStore = useUserStore();
const toaster = useToasterStore();
const authLevelConfig = ref<AuthLevelConfigDto | undefined>();
const isRedirecting = ref(false);

onMounted(async () => {
  const config = await getConfig();
  if (!(config instanceof Error)) authLevelConfig.value = config.authLevel;
});

const text = computed(() => (userStore.authLevel ? weakAuthBannerText(userStore.authLevel.reason, reauthLoopState.value) : undefined));
const canReauth = computed(() => Boolean(authLevelConfig.value?.reauth) && text.value?.canReauth === true);
const helpUrl = computed(() => authLevelConfig.value?.helpUrl || undefined);

async function reauth() {
  isRedirecting.value = true;
  try {
    await signinStrong();
  } catch {
    isRedirecting.value = false;
    toaster.addErrorMessage(REAUTH_REDIRECT_FAILED_MESSAGE);
  }
}
</script>

<template>
  <div
    v-if="userStore.isAuthDowngraded && text"
    class="fr-notice fr-notice--warning weak-auth-banner"
    role="status"
    aria-live="polite"
    data-testid="weak-auth-banner"
  >
    <div class="fr-container">
      <div class="fr-notice__body weak-auth-banner__body">
        <p class="fr-notice__title weak-auth-banner__text">
          {{ text.title }}
          <span class="fr-notice__desc">
            {{ text.description }}
            <a v-if="helpUrl" :href="helpUrl" class="fr-link" target="_blank" rel="noopener" data-testid="weak-auth-help-link">
              En savoir plus<span class="fr-sr-only"> - nouvelle fenêtre</span>
            </a>
          </span>
        </p>
        <button
          v-if="canReauth"
          type="button"
          class="fr-btn fr-btn--secondary fr-btn--sm fr-icon-refresh-line fr-btn--icon-left weak-auth-banner__reauth"
          :disabled="isRedirecting"
          data-testid="weak-auth-reauth-btn"
          @click="reauth"
        >
          {{ isRedirecting ? "Redirection…" : "Se reconnecter" }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.weak-auth-banner__body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.weak-auth-banner__text {
  margin-bottom: 0;
}

.weak-auth-banner__reauth {
  flex-shrink: 0;
}
</style>
