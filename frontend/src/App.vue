<script setup lang="ts">
import { ref, computed } from "vue";
import { useRegisterSW } from "virtual:pwa-register/vue";
import { useToasterStore } from "./stores/toasterStore.js";
import { routeNames } from "./router/route-names";
import { getAuthentication } from "./services/authentication";
import router from "./router/index.js";
import { useRoute } from "vue-router";
import { useUserStore } from "@/stores/userStore.js";
import { AdminLevel } from "./models/user.js";
import { configureClients } from "./api/init-clients.js";
import SearchHeader from "./components/search/SearchHeader.vue";

const route = useRoute();

const userStore = useUserStore();
const toaster = useToasterStore();

configureClients(toaster);

const appVersion = import.meta.env.VITE_RDA_APP_VERSION ?? "VITE_RDA_APP_VERSION";
const envLabel = import.meta.env.VITE_ENV_LABEL ?? "";

const versionLink = computed(() => ({
  label: `📦 ${appVersion}`,
  href: `https://github.com/dnum-mi/referentiel-applications/releases/tag/${appVersion}`,
}));

interface QuickLink {
  label: string
  to: { name: string } | string
  icon?: string
  iconAttrs?: Record<string, string>
}

if (getAuthentication().authenticated) {
  userStore.fetchUser();
}

const authenticatedQuickLinks = computed<QuickLink[]>(() => {
  const baseLinks: QuickLink[] = [
    {
      label: "Mon profil",
      to: { name: routeNames.PROFILE },
      icon: "ri-user-line",
      iconAttrs: { title: "Accéder à mon profil" },
    },
    {
      label: "Déconnexion",
      to: getAuthentication().createLogoutUrl({
        redirectUri: window.location.origin + router.resolve({ name: "accueil" }).href,
      }),
      icon: "ri-logout-box-r-line",
      iconAttrs: { title: "Déconnexion" },
    },
  ];
  if (userStore.adminLevel >= AdminLevel.ADMIN) {
    baseLinks.unshift({
      label: "Admin",
      to: { name: routeNames.ADMINPAGE },
      icon: "ri-user-settings-line",
      iconAttrs: { title: "Admin" },
    });
  }
  return baseLinks;
});

const loginRedirectUrl = ref<string>("");

getAuthentication().createLoginUrl({
  redirectUri: window.location.href,
}).then((url) => {
  loginRedirectUrl.value = url;
});

const unauthenticatedQuickLinks = computed<QuickLink[]>(() => ([{
  label: "Se connecter",
  to: loginRedirectUrl.value,
  icon: "ri-lock-line",
  iconAttrs: { title: "Se connecter" },
}]));

const quickLinks = computed<QuickLink[]>(() => {
  if (!userStore.authenticated) {
    return unauthenticatedQuickLinks.value;
  }
  return authenticatedQuickLinks.value;
});

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
    text: "Signalements",
  },
  {
    to: { name: routeNames.HISTORY },
    text: "Modifications",
  },
];

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
    href: "/api/v2/swagger/",
  },
];
const mandatoryLinks = computed(() => [
  { label: "Accessibilité : non conforme", to: "accessibilite" },
  {
    label: "Contact Tchap",
    href: "https://www.tchap.gouv.fr/#/room/!ydoKqFOXRAQPQYFvqa:agent.interieur.tchap.gouv.fr?via=agent.interieur.tchap.gouv.fr",
    target: "_blank",
  },
  {
    label: "Contacter l’équipe",
    href: "mailto:support-referentiel-applications@interieur.gouv.fr",
    target: "_blank",
    icon: "fr-icon-mail-line",
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
  <SkipLinks data-testid="skip-links" />
  <DsfrHeader
    :service-description="serviceDescription"
    :service-title="serviceTitle"
    :logo-text="logoText"
    :quick-links="quickLinks"
    data-testid="main-header"
  >
    <div v-if="envLabel" class="env-label">
      {{ envLabel }}
    </div>
    <div v-if="userStore.authenticated" class="header-container">
      <SearchHeader />
    </div>

    <template #mainnav>
      <DsfrNavigation v-if="userStore.authenticated" :nav-items="navItems" data-testid="main-navigation" />
    </template>
  </DsfrHeader>

  <div class="fr-mt-3w fr-mt-md-5w fr-mb-5w">
    <RouterView :key="route.params.id" />
  </div>

  <DsfrFooter :logo-text :home-to :ecosystem-links :mandatory-links :after-mandatory-links :operator-to data-testid="footer" />

  <ReloadPrompt :offline-ready="offlineReady" :need-refresh="needRefresh" data-testid="pwa-reload-prompt" @close="close" @update-service-worker="updateServiceWorker" />

  <AppToaster :messages="toaster.messages" data-testid="toast-container" @close-message="toaster.removeMessage($event)" />
</template>
