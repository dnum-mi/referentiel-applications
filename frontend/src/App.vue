<script setup lang="ts">
import { ref, computed, getCurrentInstance } from "vue";
import { useRegisterSW } from "virtual:pwa-register/vue";
import useToaster from "./composables/use-toaster";
import { routeNames } from "./router/route-names";
import { authentication } from "./services/authentication";
import Applications from "@/api/application";
import { useRouter } from "vue-router";

const router = useRouter();
const instance = getCurrentInstance();

const trackSearch = () => {
  if (searchQuery.value.trim()) {
    instance?.proxy?.$matomo?.trackEvent("Search", "Performed", searchQuery.value);
  }
};

const authenticated = ref(false);
const unauthenticatedQuickLinks = ref<QuickLink[]>([]);
const authenticatedQuickLinks = ref<QuickLink[]>([]);

const appVersion: string = import.meta.env.VITE_APP_VERSION ? `${import.meta.env.VITE_APP_VERSION}` : "VITE_APP_VERSION";

interface QuickLink {
  label: string;
  to: { name: string } | string;
  icon?: string;
  iconAttrs?: Record<string, string>;
}

(async () => {
  authenticated.value = await authentication.init({ onLoad: "check-sso" });
  const loginUrlLink = await authentication.createLoginUrl({ redirectUri: window.location.href });
  unauthenticatedQuickLinks.value = [
    {
      label: "Se connecter",
      to: loginUrlLink,
      icon: "ri-lock-line",
      iconAttrs: { title: "Se connecter" },
    },
  ];
  if (authenticated.value) {
    authenticatedQuickLinks.value = [
      { label: "Rechercher une application", to: { name: routeNames.SEARCHAPP } },
      { label: "Mes signalements", to: { name: routeNames.ISSUELIST } },
      {
        label: "Déconnexion",
        to: authentication.createLogoutUrl(),
        icon: "ri-logout-box-r-line",
        iconAttrs: { title: "Déconnexion" },
      },
    ];
  }
})();

const quickLinks = computed(() => (authenticated.value ? authenticatedQuickLinks.value : unauthenticatedQuickLinks.value));

const toaster = useToaster();

const logoText = ["Ministère", "de l’intérieur"];
const serviceDescription = "Une application pour les réunir toutes";
const serviceTitle = "Référentiel des Applications";
const homeTo = "/applications";
const operatorTo = "/applications";
const ecosystemLinks = [
  { label: "CCT", href: "http://cct.sg.minint.fr/accueil/Accueil.html" },
  { label: "Code source", href: "http://github.com/dnum-mi/referentiel-applications" },
  { label: "Api du référentiel", href: `${import.meta.env.VITE_RDA_API_URL ?? "VITE_RDA_API_URL"}/api/v2/` },
];
const mandatoryLinks = [
  { label: "Accessibilité : non conforme", to: "accessibilite" },
  {
    label: "Contact Tchap",
    href: "https://www.tchap.gouv.fr/#/room/!ydoKqFOXRAQPQYFvqa:agent.interieur.tchap.gouv.fr?via=agent.interieur.tchap.gouv.fr",
    target: "_blank",
  },
  { label: `${appVersion}`, href: `http://github.com/dnum-mi/referentiel-applications/releases/tag/${appVersion}` },
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
  if (newVal.trim() === "") {
    searchResults.value = [];
    return;
  }
  debounceTimeout = setTimeout(async () => {
    try {
      trackSearch();
      isLoading.value = true;
      errorMessage.value = "";
      const results = await Applications.getAllApplicationBySearch(newVal);
      searchResults.value = results || [];
    } catch (error) {
      instance?.proxy?.$matomo?.trackEvent("Error", "Search Error", error.message);
      errorMessage.value = "Une erreur est survenue lors du chargement des applications.";
    } finally {
      isLoading.value = false;
    }
  }, 300);
});

const trackResultSelection = (appLabel: string) => {
  instance?.proxy?.$matomo?.trackEvent("Search", "Result Selected", appLabel);
  clearSearch();
};

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
      show-beta
      :showSearch="authenticated"
    />

    <div v-if="searchQuery && (searchResults.length || isLoading || errorMessage)" class="search-results-dropdown">
      <div v-if="isLoading" class="loading-message">Chargement...</div>
      <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
      <ul v-if="searchResults.length">
        <li v-for="(app, index) in searchResults" :key="index" @click="trackResultSelection(app.label)">
          <router-link :to="{ name: 'application', params: { id: app.id } }">
            {{ app.label || "Application" }}
          </router-link>
        </li>
      </ul>
    </div>
  </div>
  <div class="fr-container fr-mt-3w fr-mt-md-5w fr-mb-5w">
    <router-view :key="$route.fullPath" />
  </div>

  <DsfrFooter :logo-text :home-to :ecosystem-links :mandatory-links :operator-to />

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
