import { createRouter, createWebHistory, type RouteLocationNormalized, type RouteRecordRaw } from "vue-router";
import { routeNames } from "./route-names";
import { USER_MANAGER, resumeStrongReauthAfterLogout } from "@/services/authentication";
import { consumeReauthAttempt } from "@/composables/use-auth-level";
import { useUserStore } from "@/stores/userStore";
import { Permission } from "@/client";
import { isChunkLoadError, reloadOnStaleChunk } from "@/utils/stale-chunk";

const oidcRoutes = [
  {
    name: routeNames.AUTH_CALLBACK,
    path: "callback",
    beforeEnter: async () => {
      try {
        await USER_MANAGER.signinCallback();
      } catch (error) {
        // #1985 : reconnexion forte annulée ou refusée chez le fournisseur — sans nettoyage, le
        // prochain `/users/me` afficherait à tort « votre reconnexion n'a pas été reconnue ».
        consumeReauthAttempt();
        throw error;
      }
      // L'événement userLoaded met à jour le store et appelle fetchUser automatiquement
      const redirectPath = sessionStorage.getItem("redirectAfterLogin");
      sessionStorage.removeItem("redirectAfterLogin");
      return redirectPath || { name: routeNames.ACCUEIL };
    },
    meta: { requiresAuth: false, title: "Authentification - Référentiel des applications" },
  },
  {
    name: routeNames.AUTH_SILENT_CALLBACK,
    path: "silent-callback",
    // #2382 : cible du renew silencieux OIDC (iframe caché). En pratique, `main.ts` traite déjà
    // le callback sans monter l'application quand la page est chargée dans l'iframe ; cette route
    // n'est là que comme filet de sécurité si l'app venait à se monter.
    beforeEnter: async () => {
      await USER_MANAGER.signinSilentCallback().catch(() => undefined);
      return false;
    },
    meta: { requiresAuth: false, title: "Renouvellement de session" },
  },
  {
    name: routeNames.SIGNIN,
    path: "login",
    beforeEnter: async () => USER_MANAGER.signinRedirect(),
    meta: { requiresAuth: false, title: "Connexion - Référentiel des applications" },
  },
  {
    name: routeNames.LOGOUT,
    path: "logout",
    beforeEnter: async () => USER_MANAGER.signoutRedirect(),
    meta: { requiresAuth: false, title: "Déconnexion - Référentiel des applications" },
  },
];

const routes = [
  {
    path: "/oidc",
    children: oidcRoutes,
  },
  {
    name: routeNames.ACCUEIL,
    path: "/",
    component: () => import("@/views/HomePage.vue"),
    meta: { requiresAuth: false, title: "Accueil - Référentiel des applications" },
  },
  {
    name: routeNames.SITEMAP,
    path: "/plan-du-site",
    component: () => import("@/views/SiteMapPage.vue"),
    meta: { requiresAuth: false, title: "Plan du site - Référentiel des applications" },
  },
  {
    name: routeNames.SEARCHAPP,
    path: "/recherche-application",
    component: () => import("@/views/ApplicationSearchPage.vue"),
    meta: { requiresAuth: true, title: "Recherche d'applications - Référentiel des applications" },
  },
  {
    name: routeNames.CREATEAPP,
    path: "/applications/creer",
    component: () => import("@/views/CreateApplicationPage.vue"),
    meta: { requiresAuth: true, title: "Créer une application - Référentiel des applications" },
  },
  {
    name: routeNames.ACCESSIBILITE,
    path: "/accessibilite",
    component: () => import("@/views/AccessibilityPage.vue"),
    meta: { requiresAuth: false, title: "Accessibilité - Référentiel des applications" },
  },
  {
    name: routeNames.REPORTS,
    path: "/signalements",
    component: () => import("@/views/ReportsPage.vue"),
    meta: { requiresAuth: true, title: "Signalements - Référentiel des applications" },
  },
  {
    name: routeNames.PROFILEAPP,
    path: "/applications/:id/:tab?",
    component: () => import("@/views/ApplicationPage.vue"),
    meta: { requiresAuth: true, title: "Profil d'application - Référentiel des applications" },
  },
  {
    name: routeNames.NOTIFICATIONS,
    path: "/notifications",
    component: () => import("@/views/NotificationsPage.vue"),
    meta: { requiresAuth: true, title: "Notifications - Référentiel des applications" },
  },
  {
    name: routeNames.PROFILE,
    path: "/profil",
    component: () => import("@/views/UserProfilePage.vue"),
    meta: { requiresAuth: true, title: "Profil utilisateur - Référentiel des applications" },
  },
  {
    name: routeNames.ADMINPAGE,
    path: "/administration",
    component: () => import("@/views/AdminPage.vue"),
    meta: { requiresAuth: true, requiresAdmin: true, title: "Administration - Référentiel des applications" },
  },
  {
    name: routeNames.QUALITYPAGE,
    path: "/qualite-generale",
    component: () => import("@/views/QualityPage.vue"),
    meta: { requiresAuth: true, title: "Qualité générale - Référentiel des applications" },
  },
  {
    name: routeNames.ENDOFLIFE,
    path: "/fins-de-vie",
    component: () => import("@/views/EndOfLifePage.vue"),
    // #2413 : titre aligné sur l'entrée de menu « Technologies » ; le plan du site en dérive son libellé.
    meta: { requiresAuth: true, title: "Technologies - Référentiel des applications" },
  },
  {
    name: routeNames.TIMEPAGE,
    path: "/time",
    component: () => import("@/views/TimePage.vue"),
    meta: { requiresAuth: true, title: "Diagramme Time - Référentiel des applications" },
  },
  {
    name: routeNames.HISTORY,
    path: "/historique",
    component: () => import("@/views/MetadataPage.vue"),
    meta: { requiresAuth: true, requiresGlobalAdmin: true, title: "Historique global - Référentiel des applications" },
  },
  {
    name: routeNames.METADATADETAIL,
    path: "/metadatas/:id",
    component: () => import("@/views/MetadataDetailPage.vue"),
    meta: { requiresAuth: true, requiresGlobalAdmin: true, title: "Détails de la modification - Référentiel des applications" },
  },

  {
    name: routeNames.DATA_APPLICATION_DETAIL,
    path: "/applications/:applicationId/data/:dataApplicationId",
    component: () => import("@/components/data-application/DataApplicationDetail.vue"),
    props: (route: RouteLocationNormalized) => ({
      applicationId: route.params.applicationId as string,
      dataApplicationId: route.params.dataApplicationId as string,
    }),
    meta: { requiresAuth: true, title: "Détail de la donnée - Référentiel des applications" },
  },
  {
    path: "/:pathMatch(.*)*",
    name: routeNames.NOTFOUND,
    component: () => import("@/views/NotFoundPage.vue"),
    meta: { requiresAuth: false, title: "Page non trouvée - Référentiel des applications" },
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env?.BASE_URL || ""),
  routes: routes as RouteRecordRaw[],
});

// Guard to protect routes that require authentication
router.beforeEach(async (to) => {
  // #1985 : retour de la déconnexion demandée par une reconnexion forte — on relance la connexion.
  if (await resumeStrongReauthAfterLogout()) return false;
  const userStore = useUserStore();

  if (to.meta.requiresAuth) {
    const user = await USER_MANAGER.getUser();
    if (!user) {
      // Store the intended destination to redirect after login
      sessionStorage.setItem("redirectAfterLogin", to.fullPath);
      return { name: routeNames.SIGNIN };
    }

    if (!userStore.user) {
      await userStore.fetchUser();
    }

    if (to.meta.requiresAdmin) {
      // QualityCampaignManage et MditCampaignManage peuvent être déléguées à un non-admin
      // (#2282, #2608) pour donner accès au seul onglet "Campagnes" correspondant de
      // /administration, sans le reste du panneau (filtré par tab dans AdminPage.vue).
      if (!userStore.hasPermissions([Permission.ADMIN_PANEL_MANAGE, Permission.QUALITY_CAMPAIGN_MANAGE, Permission.MDIT_CAMPAIGN_MANAGE])) {
        return { path: "/" };
      }
    }

    // #2440 : contrairement à `requiresAdmin`, pas de délégation possible via
    // QualityCampaignManage — l'historique global expose les valeurs de champs (emails
    // d'acteurs, dates de conformité…) de toutes les applications, réservé aux administrateurs.
    // #2446 : aux administrateurs GLOBAUX — un périmètre organisationnel ne découpe pas cet
    // historique, dont les endpoints exigent désormais `GlobalAdminManage`.
    if (to.meta.requiresGlobalAdmin && !userStore.hasPermissions([Permission.GLOBAL_ADMIN_MANAGE])) {
      return { path: "/" };
    }
  }
});

// Échec de chargement d'un composant de route lazy (chunk obsolète après un
// déploiement, #2149) : on recharge la page sur la destination visée.
router.onError((error, to) => {
  if (isChunkLoadError(error)) {
    reloadOnStaleChunk(to.fullPath);
  }
});

const APP_TITLE_SUFFIX = "Référentiel des applications";

/**
 * RGAA-007 : titres de page uniques et explicites. Appelable depuis les vues
 * dont le titre dépend de données chargées après la navigation (nom d'application,
 * pagination…). Le `afterEach` ci-dessous fournit le titre par défaut.
 */
export function setPageTitle(parts: string | string[]) {
  const segments = Array.isArray(parts) ? parts : [parts];
  document.title = [...segments, APP_TITLE_SUFFIX].filter(Boolean).join(" - ");
}

// Update document title when navigating (titre par défaut)
router.afterEach((to) => {
  if (to.meta.title) {
    document.title = to.meta.title as string;
  }
});

export default router;
