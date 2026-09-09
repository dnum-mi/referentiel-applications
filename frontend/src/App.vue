<script setup lang="ts">
import { Permission, type ConfigDto } from "@/client";
import { ref, computed, nextTick } from "vue";
import { useAppUpdate } from "./composables/use-app-update";
import { useToasterStore } from "./stores/toasterStore";
import { routeNames } from "./router/route-names";
import { buildNavItems, buildPublicNavItems } from "./router/nav-items";
import { getConfig } from "./services/config";
import { useRoute, useRouter } from "vue-router";
import { useUserStore } from "@/stores/userStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { useNotificationPolling } from "./composables/use-notification-polling";
import { configureClients } from "./api/init-clients";
import SearchHeader from "./components/search/SearchHeader.vue";
import NotificationBell from "./components/notification/NotificationBell.vue";
import EmailPreviewModal from "./components/EmailPreviewModal.vue";
import ImpersonationBanner from "./components/ImpersonationBanner.vue";
import AppToaster from "./components/AppToaster.vue";
import { useScheme } from "@gouvminint/vue-dsfr";
import { useRgaaGlobalA11y } from "./composables/use-rgaa-a11y";
import { accessibilityDeclaration } from "./constants/accessibility-declaration";
import MaintenanceBanner from "./components/MaintenanceBanner.vue";
import { useMaintenanceMode } from "./composables/use-maintenance-mode";
import OnboardingDebugPanel from "./components/OnboardingDebugPanel.vue";
import BlockedAccessScreen from "./components/BlockedAccessScreen.vue";
import { blockedAccessState } from "./composables/use-blocked-access";

const route = useRoute();
const router = useRouter();

const pageTitleAnnouncer = ref<HTMLElement | null>(null);
const currentPageTitle = ref("");

// 12.8 / 7.1 : simuler un rechargement de page pour les TA après chaque navigation SPA.
// On ignore les navigations qui ne changent que la query string (ex. filtres de recherche mis à jour
// via router.replace) : sinon le focus est repris au h1 pendant que l'utilisateur saisit dans un champ.
router.afterEach(async (to, from) => {
  if (to.path === from.path) return;
  currentPageTitle.value = (to.meta.title as string) ?? document.title;
  await nextTick();
  pageTitleAnnouncer.value?.focus();
});

const userStore = useUserStore();
const notificationStore = useNotificationStore();
const appConfig = ref<ConfigDto>();
const toaster = useToasterStore();
const { maintenanceMode } = useMaintenanceMode();

configureClients(toaster);

useNotificationPolling();

const appVersion = __APP_VERSION__;
const environmentLabel = computed(() => appConfig.value?.environmentLabel);

// RGAA-016 : pas d'emoji « 📦 » lu tel quel par les lecteurs d'écran.
// RGAA-015 : mention « nouvelle fenêtre » (le lien s'ouvre dans un nouvel onglet).
const versionLink = computed(() => ({
  label: appVersion,
  title: `Version ${appVersion} - nouvelle fenêtre`,
  href: `https://github.com/dnum-mi/referentiel-applications/releases/tag/${appVersion}`,
  target: "_blank",
  to: undefined,
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
  if (userStore.hasPermissions([Permission.ADMIN_PANEL_MANAGE])) {
    baseLinks.unshift({
      label: "Admin",
      to: { name: routeNames.ADMINPAGE },
      icon: "ri-user-settings-line",
      iconAttrs: { title: "Admin" },
    });
  }
  return baseLinks;
});

const operatorImgSrc = "/assets/logo.svg";
const operatorImgAlt = "Ministère de l'intérieur - Référentiel des Applications";
const operatorImgStyle = {
  maxHeight: "none",
  width: "5rem",
};

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

const baseNavItems = computed(() => buildNavItems(userStore.hasPermissions([Permission.GLOBAL_ADMIN_MANAGE])));

const publicNavItems = computed(() => buildPublicNavItems());

const navItemsComputed = computed(() => {
  return userStore.authenticated ? baseNavItems.value : publicNavItems.value;
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
  // RGAA-015 : ces liens sont rendus par DSFR avec target="_blank" → l'indiquer dans l'intitulé.
  return links.map((link) => ({
    ...link,
    title: link.title?.includes("nouvelle fenêtre") ? link.title : `${link.title ?? link.label} - nouvelle fenêtre`,
  }));
});
const mandatoryLinks = computed(() => [
  { label: accessibilityDeclaration.complianceMention, title: "Aller à la page d'accessibilité", to: "accessibilite" },
  { label: "Plan du site", title: "Aller au plan du site", to: "plan-du-site" },
  {
    // RGAA-015 : ouverture dans un nouvel onglet mentionnée dans l'intitulé.
    label: "Contact Tchap",
    title: "Contact Tchap - nouvelle fenêtre",
    href: "https://www.tchap.gouv.fr/#/room/!ydoKqFOXRAQPQYFvqa:agent.interieur.tchap.gouv.fr?via=agent.interieur.tchap.gouv.fr",
    target: "_blank",
    to: undefined,
  },
  {
    label: "Contacter l'équipe",
    title: "Contacter l'équipe par email - nouvelle fenêtre",
    href: "mailto:support-referentiel-applications@interieur.gouv.fr",
    target: "_blank",
    icon: "fr-icon-mail-line",
    to: undefined,
  },
  versionLink.value,
]);
const scheme = useScheme();
function changeTheme() {
  if (!scheme) return;
  scheme.setScheme(scheme.theme.value === "light" ? "dark" : "light");
}

// RGAA-017 : le bouton « Paramètres d'affichage » doit restituer son état (mode courant).
const themeButtonTitle = computed(() =>
  scheme?.theme.value === "dark"
    ? "Paramètres d'affichage : actuellement en mode sombre, passer en mode clair"
    : "Paramètres d'affichage : actuellement en mode clair, passer en mode sombre",
);

const afterMandatoryLinks = computed(() => [
  {
    label: "Paramètres d'affichage",
    button: true,
    title: themeButtonTitle.value,
    class: "fr-icon-theme-fill fr-link--icon-left fr-px-2v",
    to: "/settings",
    onclick: changeTheme,
  },
]);

useRgaaGlobalA11y();

useAppUpdate();

const isDev = import.meta.env.DEV;
</script>

<template>
  <OnboardingDebugPanel v-if="isDev" />

  <h1 ref="pageTitleAnnouncer" class="fr-sr-only" tabindex="-1" data-testid="page-title-announcer">
    {{ currentPageTitle }}
  </h1>

  <DsfrSkipLinks
    :links="[
      { id: 'app-search', text: 'Aller à la recherche' },
      { id: 'header-nav', text: 'Aller à la navigation' },
      { id: 'main-content', text: 'Aller au contenu principal' },
      { id: 'footer', text: 'Aller au pied de page' },
    ]"
  />
  <ImpersonationBanner />
  <MaintenanceBanner :active="maintenanceMode" />
  <BlockedAccessScreen :active="blockedAccessState" />
  <DsfrHeader
    :service-description="serviceDescription"
    :service-title="serviceTitle"
    :logo-text="logoText"
    :quick-links="quickLinks"
    data-testid="main-header"
  >
    <div class="header-container">
      <SearchHeader v-if="userStore.authenticated" />
    </div>

    <template v-if="environmentLabel" #before-quick-links>
      <DsfrBadge :label="environmentLabel" type="warning" data-testid="environment-badge" />
    </template>

    <!-- DsfrHeaderMenuLinks (quick-links) rend son propre <ul class="fr-btns-group"> et ne
         permet pas d'y injecter un <li> personnalisé : on reproduit la même classe ici pour
         que la cloche s'aligne visuellement dans le même groupe qu'Admin/Mon profil/Déconnexion. -->
    <template v-if="userStore.authenticated" #after-quick-links>
      <ul class="fr-btns-group">
        <li>
          <NotificationBell />
        </li>
      </ul>
    </template>

    <template #mainnav>
      <DsfrNavigation v-if="userStore.authenticated" :nav-items="navItemsComputed" id="header-nav" data-testid="main-navigation" />
      <p v-else class="fr-sr-only" id="header-nav">Navigation non disponible</p>
    </template>
  </DsfrHeader>
  <main class="fr-mt-3w fr-mt-md-5w fr-mb-5w" id="main-content" role="main">
    <RouterView :key="String(route.params.id ?? '')" />
  </main>

  <DsfrFooter
    :logo-text="logoText"
    desc-text="Référentiel des applications du ministère de l'Intérieur : recensement des applications, de leurs données et de leurs relations."
    :operator-img-src="operatorImgSrc"
    :operator-img-alt="operatorImgAlt"
    :operator-img-style="operatorImgStyle"
    :home-to="homeTo"
    :ecosystem-links="ecosystemLinks"
    :mandatory-links="mandatoryLinks"
    :after-mandatory-links="afterMandatoryLinks"
    :operator-to="operatorTo"
    data-testid="footer"
  />

  <AppToaster :messages="toaster.messages" data-testid="app-toaster" @close-message="toaster.removeMessage($event)" />

  <!-- Monté une seule fois ici : `emailPreview` est un état global du store, un montage par
       page/composant (cloche + page notifications) ouvrirait deux modales superposées. -->
  <EmailPreviewModal
    :log="notificationStore.emailPreview"
    :opened="!!notificationStore.emailPreview"
    @close="notificationStore.closeEmailPreview()"
  />
</template>

<style>
@import "./main.css";
</style>
