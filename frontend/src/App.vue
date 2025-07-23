<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRegisterSW } from "virtual:pwa-register/vue";
import useToaster from "./composables/use-toaster";
import { routeNames } from "./router/route-names";
import { authentication } from "./services/authentication";
import Applications from "@/api/application";
import router from "./router/index.js";
import { useRoute } from "vue-router";
import { useUserStore } from "@/stores/userStore.js";
const route = useRoute();

const instance = getCurrentInstance();

const trackSearch = (query: string, source: string, resultCount: number) => {
  const matomo = instance?.proxy?.$matomo;
  if (!matomo) {
    console.warn("Matomo non dispo");
    return;
  }

  const encoded = encodeURIComponent(query.trim());
  matomo.setCustomUrl(`/search?q=${encoded}`);
  matomo.trackSiteSearch(query.trim(), "Applications", resultCount);
  matomo.trackPageView(`Recherche depuis ${source} : ${query}`);
};

const userStore = useUserStore();
const unauthenticatedQuickLinks = ref<QuickLink[]>([]);
const authenticatedQuickLinks = ref<QuickLink[]>([]);

const appVersion = import.meta.env.VITE_RDA_APP_VERSION ?? "VITE_RDA_APP_VERSION";

const versionLink = computed(() => ({
  label: `📦 ${appVersion}`,
  href: `https://github.com/dnum-mi/referentiel-applications/releases/tag/${appVersion}`,
}));

interface QuickLink {
  label: string;
  to: { name: string } | string;
  icon?: string;
  iconAttrs?: Record<string, string>;
}

(async () => {
  const loginUrlLink = await authentication.createLoginUrl({
    redirectUri: window.location.href,
  });
  await userStore.fetchUser();
  unauthenticatedQuickLinks.value = [
    {
      label: "Se connecter",
      to: loginUrlLink,
      icon: "ri-lock-line",
      iconAttrs: { title: "Se connecter" },
    },
  ];
  if (userStore.authenticated) {
    const baseLinks = [];

    if (userStore.userPermissions.includes("admin")) {
      baseLinks.push({
        label: "Admin",
        to: { name: routeNames.ADMINPAGE },
        icon: "ri-user-settings-line",
        iconAttrs: { title: "Admin" },
      });
    }

    baseLinks.push(
      {
        label: "Mon profil",
        to: { name: routeNames.PROFILE },
        icon: "ri-user-line",
        iconAttrs: { title: "Accéder à mon profil" },
      },
      {
        label: "Déconnexion",
        to: authentication.createLogoutUrl({
          redirectUri: window.location.origin + router.resolve({ name: "accueil" }).href,
        }),
        icon: "ri-logout-box-r-line",
        iconAttrs: { title: "Déconnexion" },
      },
    );

    authenticatedQuickLinks.value = baseLinks;
  }
})();

const quickLinks = computed(() => (userStore.authenticated ? authenticatedQuickLinks.value : unauthenticatedQuickLinks.value));

const navItems = [
  {
    id: "nav-home",
    to: { name: routeNames.SEARCHAPP },
    text: "Applications",
  },
  {
    to: { name: routeNames.QUALITYPAGE },
    text: "Qualité Générale",
  },
  {
    to: { name: routeNames.ISSUELIST },
    text: "Corrections",
  },
];

const toaster = useToaster();

const logoText = ["Ministère", "de l’intérieur"];
const serviceDescription = "Une application pour les réunir toutes";
const serviceTitle = "Référentiel des Applications";
const homeTo = "/applications";
const operatorTo = "/applications";
const ecosystemLinks = [
  { label: "CCT", href: "http://cct.sg.minint.fr/accueil/Accueil.html" },
  { label: "Code source", href: "http://github.com/dnum-mi/referentiel-applications" },
  {
    label: "Api du référentiel",
    href: `${import.meta.env.VITE_RDA_API_URL ?? "VITE_RDA_API_URL"}/api/v2/`,
  },
];
const mandatoryLinks = computed(() => [
  { label: "Accessibilité : non conforme", to: "accessibilite" },
  {
    label: "Contact Tchap",
    href: "https://www.tchap.gouv.fr/#/room/!ydoKqFOXRAQPQYFvqa:agent.interieur.tchap.gouv.fr?via=agent.interieur.tchap.gouv.fr",
    target: "_blank",
  },
  versionLink.value,
]);
const afterMandatoryLinks = [
  {
    label: "Paramètres d’affichage",
    button: true,
    class: "fr-icon-theme-fill fr-link--icon-left fr-px-2v",
    to: "/settings",
    onclick: changeTheme,
  },
];

const searchQuery = ref("");

const searchResults = ref<any[]>([]);
const isLoading = ref(false);
const errorMessage = ref("");
let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

watch(searchQuery, (newVal) => {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }
  debounceTimeout = setTimeout(async () => {
    try {
      isLoading.value = true;
      errorMessage.value = "";
      const response = await Applications.getAllApplicationBySearch(newVal);
      searchResults.value = response.results || [];

      const query = newVal.trim();
      const resultCount = searchResults.value.total;
      trackSearch(query, "le header", resultCount);
      trackResultClick(app.label);
    } catch (error) {
      instance?.proxy?.$matomo?.trackEvent("Error", "Search Error", error.message);
    } finally {
      isLoading.value = false;
    }
  }, 300);
});

const clearSearch = () => {
  searchQuery.value = "";
  searchResults.value = [];
  instance?.proxy?.$matomo.trackEvent("search", "click", "search-result");
};

const { setScheme, theme } = useScheme();
function changeTheme() {
  setScheme(theme.value === "light" ? "dark" : "light");
}

const { offlineReady, needRefresh, updateServiceWorker } = useRegisterSW();
function close() {
  offlineReady.value = false;
  needRefresh.value = false;
}
</script>

<template>
  <div class="header-container">
    <DsfrHeader
      v-model="searchQuery"
      :service-description="serviceDescription"
      :service-title="serviceTitle"
      :logo-text="logoText"
      :quick-links="quickLinks"
      :showSearch="userStore.authenticated"
    >
      <template #mainnav>
        <DsfrNavigation v-if="userStore.authenticated" :nav-items="navItems" />
      </template>
    </DsfrHeader>

    <div v-if="searchQuery && (searchResults.length || isLoading || errorMessage)" class="search-results-dropdown">
      <div v-if="isLoading" class="loading-message">Chargement...</div>
      <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
      <ul v-if="searchResults.length">
        <li v-for="(app, index) in searchResults" :key="index" @click="clearSearch">
          <router-link :to="{ name: 'application', params: { id: app.id } }">
            {{ app.label || "Application" }}
          </router-link>
        </li>
      </ul>
    </div>
  </div>
  <div class="fr-mt-3w fr-mt-md-5w fr-mb-5w">
    <RouterView :key="route.params.id" />
  </div>

  <DsfrFooter :logo-text :home-to :ecosystem-links :mandatory-links :after-mandatory-links :operator-to />

  <!-- <DsfrConsent>
    <p>
      Nous avons recours à plusieurs cookies afin d'améliorer votre
      expérience sur cette application. Vos données vous appartiennent
      et ce bandeau vous permet de sélectionner les cookies que vous
      souhaitez activer. Pour plus d'informations, consultez notre page
      <a href="/donnee">Données personnelles et cookies</a>.
    </p>
  </DsfrConsent> -->

  <ReloadPrompt :offline-ready="offlineReady" :need-refresh="needRefresh" @close="close" @update-service-worker="updateServiceWorker" />

  <AppToaster :messages="toaster.messages" @close-message="toaster.removeMessage($event)" />
</template>

<style scoped>
.header-container {
  position: relative;
}

.search-results-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background-color: white;
  width: 100%;
  max-width: 384px;
  border: 1px solid #ccc;
  border-radius: 4px;
  z-index: 1000;
  margin-top: 0.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.search-results-dropdown ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.search-results-dropdown li {
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

/* Ajout d'un effet survol */
.search-results-dropdown li:hover {
  background-color: #f0f0f0;
}

.loading-message,
.error-message {
  padding: 0.5rem;
  text-align: center;
}
</style>
