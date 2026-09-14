<script setup lang="ts">
import type { AuthLevelConfigDto } from "@/client";
import { REAUTH_REDIRECT_FAILED_MESSAGE, reauthLoopState, weakAuthBannerText, type ReauthStrategy } from "@/composables/use-auth-level";
import { signinStrong } from "@/services/authentication";
import { getConfig } from "@/services/config";
import { useUserStore } from "@/stores/userStore";
import { computed, onMounted, ref } from "vue";

// #1985 — Écran de reconnexion remplaçant les vues du référentiel en session faible.
// Conditionné sur `downgraded` : le mode observe ne bloque pas l'accès.
const userStore = useUserStore();
const authLevelConfig = ref<AuthLevelConfigDto | undefined>();
const isRedirecting = ref(false);
const redirectError = ref("");
const heading = ref<HTMLElement>();

onMounted(async () => {
  const config = await getConfig();
  if (!(config instanceof Error)) authLevelConfig.value = config.authLevel;
  heading.value?.focus();
});

const text = computed(() => (userStore.authLevel ? weakAuthBannerText(userStore.authLevel.reason, reauthLoopState.value) : undefined));
const canReauth = computed(() => Boolean(authLevelConfig.value?.reauth) && text.value?.canReauth === true);
const helpUrl = computed(() => authLevelConfig.value?.helpUrl || undefined);
// Après une reconnexion restée sans effet, le bouton ferme complètement la session SSO avant de
// reconnecter : le référentiel n'a pas besoin de savoir si le fournisseur honore `prompt=login`
// pour offrir une issue. `AUTH_LEVEL_REAUTH_STRATEGY=logout` impose cette voie d'emblée.
const strategy = computed<ReauthStrategy>(() => (reauthLoopState.value ? "logout" : (authLevelConfig.value?.reauth?.strategy ?? "prompt")));
const reauthLabel = computed(() => (strategy.value === "logout" ? "Se déconnecter puis se reconnecter" : "Se reconnecter"));

async function reauth() {
  redirectError.value = "";
  isRedirecting.value = true;
  try {
    await signinStrong(strategy.value);
  } catch {
    isRedirecting.value = false;
    redirectError.value = REAUTH_REDIRECT_FAILED_MESSAGE;
  }
}
</script>

<template>
  <section
    v-if="userStore.isAuthDowngraded && text"
    class="fr-container weak-auth-screen"
    role="status"
    aria-live="polite"
    data-testid="weak-auth-banner"
  >
    <div class="fr-grid-row fr-grid-row--center">
      <div class="fr-col-12 fr-col-md-8">
        <h1 ref="heading" tabindex="-1">{{ text.title }}</h1>
        <p class="fr-text--lead">{{ text.description }}</p>
        <button
          v-if="canReauth"
          type="button"
          class="fr-btn fr-icon-refresh-line fr-btn--icon-left"
          :disabled="isRedirecting"
          data-testid="weak-auth-reauth-btn"
          @click="reauth"
        >
          {{ isRedirecting ? "Redirection…" : reauthLabel }}
        </button>
        <p v-if="redirectError" class="fr-error-text fr-mt-2w" role="alert">{{ redirectError }}</p>
        <p class="fr-mt-4w">
          <a v-if="helpUrl" :href="helpUrl" class="fr-link" target="_blank" rel="noopener" data-testid="weak-auth-help-link">
            En savoir plus<span class="fr-sr-only"> - nouvelle fenêtre</span>
          </a>
          <span v-else>Si vous avez déjà utilisé une authentification forte, contactez le support du référentiel.</span>
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.weak-auth-screen {
  padding-block: 3rem;
}
</style>
