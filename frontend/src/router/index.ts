import { createRouter, createWebHistory } from "vue-router";
import { routeNames } from "./route-names";

const routes = [
  {
    path: "/",
    name: "accueil",
    component: () => import("@/views/AppHome.vue"),
    meta: { requiresAuth: false },
  },
  {
    name: routeNames.SEARCHAPP,
    path: "/recherche-application",
    component: () => import("@/views/GlobalSearch.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/accessibilite",
    name: "accessibilite",
    component: () => import("@/views/Accessibility.vue"),
    meta: { requiresAuth: false },
  },
  {
    name: routeNames.ISSUELIST,
    path: "/issue-list",
    component: () => import("@/views/IssuePage.vue"),
    meta: { requiresAuth: true },
  },
  {
    name: routeNames.CREATEAPP,
    path: "/create-application",
    component: () => import("@/views/CreateApplication.vue"),
    props: true,
    meta: { requiresAuth: true },
  },
  {
    name: routeNames.PROFILEAPP,
    path: "/applications/:id",
    component: () => import("@/views/ApplicationProfile.vue"),
    meta: { requiresAuth: true },
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env?.BASE_URL || ""),
  routes,
});

export default router;
