<script setup lang="ts">
import { routeNames } from "@/router/route-names";
</script>

<template>
  <div class="fr-container fr-my-2w">
    <DsfrErrorPage
      title="Oups, perdu ?"
      subtitle="Erreur 404: Je suis une théière"
      description="Il semblerait que vous ayez demandé du café à une théière. Essayons de remettre les choses au clair."
      help="Si vous cherchez du thé, vous êtes au bon endroit. Sinon, peut-être voulez-vous retourner à la page d'accueil ?"
    >
      <template #default>
        <router-link :to="{ name: routeNames.SEARCHAPP }">
          <DsfrButton variant="secondary" size="small"> Retour à l'accueil </DsfrButton>
        </router-link>
      </template>
    </DsfrErrorPage>
  </div>
</template>
