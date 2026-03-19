<script setup lang="ts">
import type { ConfigDto } from "@/client";
import { ref, computed } from "vue";
import { useRegisterSW } from "virtual:pwa-register/vue";
import { useToasterStore } from "./stores/toasterStore";
import { routeNames } from "./router/route-names";
import { getConfig } from "./services/config";
import { useRoute } from "vue-router";
import { useUserStore } from "@/stores/userStore";
import { AdminLevel } from "./models/user";
import { configureClients } from "./api/init-clients";
import SearchHeader from "./components/search/SearchHeader.vue";
import AppToaster from "./components/AppToaster.vue";
import { useScheme } from "@gouvminint/vue-dsfr";
import ReloadPrompt from "./components/ReloadPrompt.vue";

const route = useRoute();

const userStore = useUserStore();
const appConfig = ref<ConfigDto>();
const toaster = useToasterStore();
const isClosed = ref(false);
function closeNotice() {
  isClosed.value = true;
}

configureClients(toaster);

const appVersion = __APP_VERSION__;
const environmentLabel = computed(() => appConfig.value?.environmentLabel);

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

getConfig().then((config) => {
  if (!(config instanceof Error)) {
    appConfig.value = config;
  }
});

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
      to: { name: routeNames.LOGOUT },
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

const operatorImgSrc = "/assets/logotitle2.svg";
const operatorImgAlt = "Ministère de l'intérieur - Référentiel des Applications";

const unauthenticatedQuickLinks = computed<QuickLink[]>(() => [
  {
    label: "Se connecter",
    to: { name: routeNames.SIGNIN },
    icon: "ri-lock-line",
    iconAttrs: { title: "Se connecter" },
  },
]);

const quickLinks = computed<QuickLink[]>(() => {
  if (!userStore.authenticated) {
    return unauthenticatedQuickLinks.value;
  }
  return authenticatedQuickLinks.value;
});

const baseNavItems = [
  { to: { name: routeNames.ACCUEIL }, text: "Accueil" },
  { to: { name: routeNames.SEARCHAPP }, text: "Applications" },
  { to: { name: routeNames.TIMEPAGE }, text: "Time" },
  { to: { name: routeNames.QUALITYPAGE }, text: "Qualité Générale" },
  { to: { name: routeNames.REPORTS }, text: "Signalements" },
  { to: { name: routeNames.HISTORY }, text: "Modifications" },
];

const publicNavItems = computed(() => {
  return [{ to: { name: routeNames.ACCUEIL }, text: "Accueil" }];
});

const navItemsComputed = computed(() => {
  return userStore.authenticated ? baseNavItems : publicNavItems.value;
});

const logoText = ["Ministère", "de l'intérieur"];
const serviceDescription = "Une application pour les réunir toutes";
const serviceTitle = "Référentiel des Applications";
const homeTo = "/applications";
const operatorTo = "/applications";
const ecosystemLinks = computed(() => {
  const links = [
    {
      label: "Cadre de Cohérence Technique (CCT)",
      title: "Aller au Cadre de Cohérence Technique (CCT)",
      href: "http://cct.sg.minint.fr/accueil/Accueil.html",
    },
    { label: "Code source", title: "Aller au code source de l'application", href: "http://github.com/dnum-mi/referentiel-applications" },
    {
      label: "Api du référentiel",
      title: "Aller à la documentation de l'API du référentiel",
      href: "/api/v2/swagger/",
    },
  ];
  if (appConfig.value?.footerLinks) {
    links.push(...appConfig.value.footerLinks);
  }
  return links;
});
const mandatoryLinks = computed(() => [
  { label: "Accessibilité : non conforme", title: "Aller à la page d'accessibilité", to: "accessibilite" },
  { label: "Plan du site", title: "Aller au plan du site", to: "plan-du-site" },
  {
    label: "Contact Tchap",
    title: "Aller au contact Tchap",
    href: "https://www.tchap.gouv.fr/#/room/!ydoKqFOXRAQPQYFvqa:agent.interieur.tchap.gouv.fr?via=agent.interieur.tchap.gouv.fr",
    to: "",
    target: "_blank",
  },
  {
    label: "Contacter l'équipe",
    title: "Envoyer un email à l'équipe du Référentiel des Applications",
    href: "mailto:support-referentiel-applications@interieur.gouv.fr",
    to: "",
    target: "_blank",
    icon: "fr-icon-mail-line",
  },
  { ...versionLink.value, to: "" },
]);
const afterMandatoryLinks = [
  {
    label: "Paramètres d'affichage",
    button: true,
    class: "fr-icon-theme-fill fr-link--icon-left fr-px-2v",
    to: "/settings",
    onclick: changeTheme,
  },
];

const scheme = useScheme();
function changeTheme() {
  if (!scheme) return;
  scheme.setScheme(scheme.theme.value === "light" ? "dark" : "light");
}

const { offlineReady, needRefresh, updateServiceWorker } = useRegisterSW();
function close() {
  offlineReady.value = false;
  needRefresh.value = false;
}
</script>

<template>
  <DsfrSkipLinks
    :links="[
      { id: 'header-search', text: 'Aller à la recherche' },
      { id: 'header-nav', text: 'Aller à la navigation' },
      { id: 'main-content', text: 'Aller au contenu principal' },
      { id: 'footer', text: 'Aller au pied de page' },
    ]"
  />
  <DsfrHeader
    :service-description="serviceDescription"
    :service-title="serviceTitle"
    :logo-text="logoText"
    :quick-links="quickLinks"
    data-testid="main-header"
  >
    <div class="header-container" id="header-search">
      <SearchHeader v-if="userStore.authenticated" />
    </div>

    <template v-if="environmentLabel" #before-quick-links>
      <DsfrBadge :label="environmentLabel" type="warning" data-testid="environment-badge" />
    </template>

    <template #mainnav>
      <DsfrNavigation v-if="userStore.authenticated" :nav-items="navItemsComputed" id="header-nav" data-testid="main-navigation" />
      <p v-else class="fr-sr-only" id="header-nav">Navigation non disponible</p>
    </template>
  </DsfrHeader>
  <DsfrNotice v-if="!isClosed" closeable title="questionnaire utilisateur" @close="closeNotice">
    Merci de contribuer à l'amélioration du Référentiel des Applications en répondant à notre
    <a href="https://grist.numerique.gouv.fr/o/retourutilisateur/forms/oJTuNbEchqS9ymzhzCXubN/4" rel="noopener noreferrer" target="_blank">
      questionnaire utilisateur
    </a>
  </DsfrNotice>
  <div class="fr-mt-3w fr-mt-md-5w fr-mb-5w" id="main-content">
    <RouterView :key="String(route.params.id ?? '')" />
  </div>

  <DsfrFooter
    :logo-text="logoText"
    :operator-img-src="operatorImgSrc"
    :operator-img-alt="operatorImgAlt"
    :home-to="homeTo"
    :ecosystem-links="ecosystemLinks"
    :mandatory-links="mandatoryLinks"
    :after-mandatory-links="afterMandatoryLinks"
    :operator-to="operatorTo"
    data-testid="footer"
  />

  <AppToaster :messages="toaster.messages" data-testid="app-toaster" @close-message="toaster.removeMessage($event)" />
  <ReloadPrompt :offline-ready="offlineReady" :need-refresh="needRefresh" @update="updateServiceWorker(true)" @close="close" />
</template>

<style>
@import "./main.css";
</style>
