<script setup lang="ts">
import { ref, computed } from "vue";
import { useRegisterSW } from "virtual:pwa-register/vue";
import useToaster from "./composables/use-toaster";
import { routeNames } from "./router/route-names";
import { authentication } from "./services/authentication";

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
  <DsfrHeader
    v-model="searchQuery"
    :service-description="serviceDescription"
    :service-title="serviceTitle"
    :logo-text="logoText"
    :quick-links="quickLinks"
    show-beta
  />

  <div class="fr-container fr-mt-3w fr-mt-md-5w fr-mb-5w">
    <router-view />
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
