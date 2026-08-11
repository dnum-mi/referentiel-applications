<script setup lang="ts">
import { routeNames } from "@/router/route-names";
import { useRouter } from "vue-router";

defineProps<{
  active: boolean;
}>();

const router = useRouter();

function logout() {
  router.push({ name: routeNames.LOGOUT });
}
</script>

<template>
  <div v-if="active" class="blocked-access-overlay" role="alertdialog" aria-modal="true" data-testid="blocked-access-screen">
    <div class="fr-container">
      <DsfrAlert
        title="Votre accès a été bloqué"
        description="Un administrateur a bloqué votre accès au Référentiel des Applications. Contactez un administrateur si vous pensez qu'il s'agit d'une erreur."
        type="error"
        data-testid="blocked-access-alert"
      />
      <DsfrButton label="Se déconnecter" class="fr-mt-3w" data-testid="blocked-access-logout-btn" @click="logout" />
    </div>
  </div>
</template>

<style scoped>
.blocked-access-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--background-default-grey);
}
</style>
