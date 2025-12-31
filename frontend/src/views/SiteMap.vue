<script setup lang="ts">
import { computed } from "vue";
import router from "@/router";
import { useUserStore } from "@/stores/userStore";
import { routeNames } from "@/router/route-names";
import { AdminLevel } from "@/models/user";

const userStore = useUserStore();

import type { RouteRecordNormalized } from "vue-router";

interface PageItem {
  label: string;
  to: { name: string | symbol | null | undefined };
}

function getRouteTitle(currentRoute: RouteRecordNormalized): string {
  const pageTitleFromMeta = currentRoute.meta?.title as string;
  if (pageTitleFromMeta) {
    const titleSeparator = " - ";
    const titleParts = pageTitleFromMeta.split(titleSeparator);
    const mainTitle = titleParts[0];

    return mainTitle;
  }
  const routeName = currentRoute.name as string;
  const routePath = currentRoute.path;
  return routeName || routePath;
}

function baseRouteFilter(currentRoute: RouteRecordNormalized): boolean {
  const routesToExclude: string[] = [routeNames.NOTFOUND, routeNames.SITEMAP];
  const routeName = currentRoute.name as string;

  if (!routeName) {
    return false;
  }
  if (routesToExclude.includes(routeName)) {
    return false;
  }
  const routePath = currentRoute.path;
  const hasDynamicSegment = routePath.includes(":");
  if (hasDynamicSegment) {
    return false;
  }

  return true;
}

const publicPages = computed(() => {
  const allRoutes = router.getRoutes();

  const filteredPublicRoutes = allRoutes.filter((currentRoute) => {
    const passesBaseFilter = baseRouteFilter(currentRoute);

    const isNotProtected = !currentRoute.meta.requiresAuth;

    return passesBaseFilter && isNotProtected;
  });

  const formattedPages = filteredPublicRoutes.map((routeDetails) => {
    return {
      label: getRouteTitle(routeDetails),
      to: { name: routeDetails.name },
    };
  });

  const sortedPages = formattedPages.sort((pageA, pageB) => {
    return pageA.label.localeCompare(pageB.label);
  });

  return sortedPages;
});

const protectedPages = computed(() => {
  if (!userStore.authenticated) {
    return [];
  }

  const allRoutes = router.getRoutes();

  const filteredProtectedRoutes = allRoutes.filter((currentRoute) => {
    const passesBaseFilter = baseRouteFilter(currentRoute);
    const isProtectedRoute = currentRoute.meta.requiresAuth === true;
    const isNotAdminPage = currentRoute.name !== routeNames.ADMINPAGE;
    const userIsAdmin = userStore.adminLevel >= AdminLevel.ADMIN;
    const passesAdminCheck = isNotAdminPage || userIsAdmin;
    return passesBaseFilter && isProtectedRoute && passesAdminCheck;
  });

  const formattedPages = filteredProtectedRoutes.map((routeDetails) => {
    return {
      label: getRouteTitle(routeDetails),
      to: { name: routeDetails.name },
    };
  });
  const sortedPages = formattedPages.sort((pageA, pageB) => {
    return pageA.label.localeCompare(pageB.label);
  });

  return sortedPages;
});
</script>

<template>
  <div class="fr-container fr-my-5w">
    <div class="fr-grid-row fr-grid-row--center">
      <div class="fr-col-12 fr-col-lg-10 fr-col-xl-8">
        <h1 class="fr-mb-5w">Plan du site</h1>

        <h2 class="fr-h4 fr-mb-3w">Pages publiques</h2>
        <ul class="fr-links-group fr-links-group--lg">
          <li v-for="page in publicPages" :key="page.to.name">
            <RouterLink :to="page.to" class="fr-link">
              {{ page.label }}
            </RouterLink>
          </li>
        </ul>

        <div v-if="protectedPages.length > 0" class="fr-mt-5w">
          <h2 class="fr-h4 fr-mb-3w">Espace connecté</h2>
          <ul class="fr-links-group fr-links-group--lg">
            <li v-for="page in protectedPages" :key="page.to.name">
              <RouterLink :to="page.to" class="fr-link">
                {{ page.label }}
              </RouterLink>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
