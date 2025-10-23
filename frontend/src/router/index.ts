import { createRouter, createWebHistory } from "vue-router";
import { routeNames } from "./route-names";

const routes = [
  {
    name: routeNames.ACCUEIL,
    path: "/",
    component: () => import("@/views/HomePage.vue"),
    meta: { requiresAuth: false, title: "Accueil - Référentiel des applications" },
  },
  {
    name: routeNames.SITEMAP,
    path: "/plan-du-site",
    component: () => import("@/views/SiteMap.vue"),
    meta: { requiresAuth: false, title: "Plan du site - Référentiel des applications" },
  },
  {
    name: routeNames.SEARCHAPP,
    path: "/recherche-application",
    component: () => import("@/views/ApplicationView.vue"),
    meta: { requiresAuth: true, title: "Recherche d'applications - Référentiel des applications" },
  },
  {
    name: routeNames.ACCESSIBILITE,
    path: "/accessibilite",
    component: () => import("@/views/AppAccessibility.vue"),
    meta: { requiresAuth: false, title: "Accessibilité - Référentiel des applications" },
  },
  {
    name: routeNames.ISSUELIST,
    path: "/signalements",
    component: () => import("@/views/IssuePage.vue"),
    meta: { requiresAuth: true, title: "Signalements - Référentiel des applications" },
  },
  {
    name: routeNames.PROFILEAPP,
    path: "/applications/:id",
    component: () => import("@/views/ApplicationProfile.vue"),
    meta: { requiresAuth: true, title: "Profil d'application - Référentiel des applications" },
  },
  {
    name: routeNames.PROFILE,
    path: "/profil",
    component: () => import("@/views/UserProfile.vue"),
    meta: { requiresAuth: true, title: "Profil utilisateur - Référentiel des applications" },
  },
  {
    name: routeNames.ADMINPAGE,
    path: "/administration",
    component: () => import("@/views/AdminPage.vue"),
    meta: { requiresAuth: true, title: "Administration - Référentiel des applications" },
  },
  {
    name: routeNames.QUALITYPAGE,
    path: "/qualite-generale",
    component: () => import("@/views/QualityPage.vue"),
    meta: { requiresAuth: true, title: "Qualité générale - Référentiel des applications" },
  },
  {
    name: routeNames.HISTORY,
    path: "/historique",
    component: () => import("@/views/MetadataPage.vue"),
    meta: { requiresAuth: true, title: "Historique global - Référentiel des applications" },
  },

  {
    path: "/:pathMatch(.*)*",
    name: routeNames.NOTFOUND,
    component: () => import("@/views/NotFound.vue"),
    meta: { requiresAuth: false, title: "Page non trouvée - Référentiel des applications" },
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env?.BASE_URL || ""),
  routes,
});

// Update document title when navigating
router.afterEach((to) => {
  if (to.meta.title) {
    document.title = to.meta.title as string;
  }
});

export default router;
