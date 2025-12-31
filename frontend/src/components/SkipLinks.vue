<script setup lang="ts">
import { AdminLevel } from "@/models/user.js";
import { routeNames } from "@/router/route-names";
import { useUserStore } from "@/stores/userStore.js";

interface SkipLink {
  text: string;
  to: { name: string };
}
const userStore = useUserStore();

const skipLinks = computed<SkipLink[]>(() => {
  const links: SkipLink[] = [
    { text: "Page d'accueil", to: { name: "accueil" } },
    { text: "Recherche", to: { name: routeNames.SEARCHAPP } },
    { text: "Profil", to: { name: routeNames.PROFILE } },
    { text: "Qualité générale", to: { name: routeNames.QUALITYPAGE } },
    { text: "Signalements", to: { name: routeNames.ISSUELIST } },
    { text: "Modifications", to: { name: routeNames.HISTORY } },
  ];
  if (userStore.adminLevel >= AdminLevel.ADMIN) {
    links.splice(3, 0, { text: "Administration", to: { name: routeNames.ADMINPAGE } });
  }

  return links;
});
</script>

<template>
  <div class="fr-skiplinks">
    <nav role="navigation" aria-label="Accès rapide" class="fr-container">
      <ul class="fr-skiplinks__list">
        <li v-for="(link, index) in skipLinks" :key="index">
          <router-link class="fr-link" :to="link.to">
            {{ link.text }}
          </router-link>
        </li>
      </ul>
    </nav>
  </div>
</template>
