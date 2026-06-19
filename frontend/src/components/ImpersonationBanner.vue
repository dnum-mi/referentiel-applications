<script setup lang="ts">
import { useUserStore } from "@/stores/userStore";
import { ref } from "vue";

const userStore = useUserStore();
const isStopping = ref(false);

async function stop() {
  isStopping.value = true;
  try {
    await userStore.stopImpersonation();
  } finally {
    isStopping.value = false;
  }
}
</script>

<template>
  <div
    v-if="userStore.isImpersonating && userStore.impersonation"
    class="fr-notice fr-notice--warning impersonation-banner"
    role="alert"
    data-testid="impersonation-banner"
  >
    <div class="fr-container">
      <div class="fr-notice__body impersonation-banner__body">
        <p class="fr-notice__title impersonation-banner__text">
          Vous êtes connecté en tant que <strong>{{ userStore.impersonation.userEmail }}</strong>
          <span class="fr-notice__desc">·&nbsp;impersonation initiée par {{ userStore.impersonation.adminEmail }}</span>
        </p>
        <button
          type="button"
          class="fr-btn fr-btn--secondary fr-btn--sm fr-icon-logout-box-r-line fr-btn--icon-left impersonation-banner__stop"
          :disabled="isStopping"
          data-testid="impersonation-stop-btn"
          @click="stop"
        >
          {{ isStopping ? "Arrêt…" : "Arrêter l'impersonation" }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Bandeau collant en haut de page, au-dessus de l'en-tête. */
.impersonation-banner {
  position: sticky;
  top: 0;
  z-index: 1000;
}

.impersonation-banner__body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.impersonation-banner__text {
  margin-bottom: 0;
}

.impersonation-banner__stop {
  flex-shrink: 0;
}
</style>
