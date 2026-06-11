import { createRouter, createWebHistory, type RouteLocationNormalized, type RouteRecordRaw } from "vue-router";
import { routeNames } from "./route-names";
import { USER_MANAGER } from "@/services/authentication";
import { useUserStore } from "@/stores/userStore";
import { Permission } from "@/client";

const oidcRoutes = [
  {
    name: routeNames.AUTH_CALLBACK,
    path: "callback",
    beforeEnter: async () => {
      await USER_MANAGER.signinCallback();
      // L'événement userLoaded met à jour le store et appelle fetchUser automatiquement
      const redirectPath = sessionStorage.getItem("redirectAfterLogin");
      sessionStorage.removeItem("redirectAfterLogin");
      return redirectPath || { name: routeNames.ACCUEIL };
    },
    meta: { requiresAuth: false, title: "Authentification - Référentiel des applications" },
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
    name: routeNames.TIMEPAGE,
    path: "/time",
    component: () => import("@/views/TimePage.vue"),
    meta: { requiresAuth: true, title: "Diagramme Time - Référentiel des applications" },
  },
  {
    name: routeNames.HISTORY,
    path: "/historique",
    component: () => import("@/views/MetadataPage.vue"),
    meta: { requiresAuth: true, title: "Historique global - Référentiel des applications" },
  },
  {
    name: routeNames.METADATADETAIL,
    path: "/metadatas/:id",
    component: () => import("@/views/MetadataDetailPage.vue"),
    meta: { requiresAuth: true, title: "Détails de la modification - Référentiel des applications" },
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
      if (!userStore.hasPermissions([Permission.ADMIN_PANEL_MANAGE])) {
        return { path: "/" };
      }
    }
  }
});

// Update document title when navigating
router.afterEach((to) => {
  if (to.meta.title) {
    document.title = to.meta.title as string;
  }
});

export default router;
