<script setup lang="ts">
import { routeNames } from "@/router/route-names";
</script>

<template>
  <div class="fr-container fr-my-2w" data-testid="not-found-page">
    <DsfrErrorPage
      title="Vous ne passerez pas"
      subtitle="Erreur 404 : la page demandée est introuvable."
      description="Même les plus grands voyageurs égarent parfois leur chemin. Cette page n’existe pas ou n’est plus accessible."
      help="Revenez à l’accueil pour poursuivre votre quête."
      data-testid="not-found-error"
    >
      <template #default>
        <router-link :to="{ name: routeNames.SEARCHAPP }">
          <DsfrButton variant="secondary" size="small" data-testid="not-found-home-btn">
            Retour à l'accueil
          </DsfrButton>
        </router-link>
      </template>
    </DsfrErrorPage>
  </div>
</template>
