import client from "@/api/index";
import { Roles, type Permission, type UserFollowedApplicationDto, type UserWithPermissions } from "@/client/types.gen";
import type { APP_PERMISSIONS } from "@/models/Application";
import { USER_MANAGER } from "@/services/authentication";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

export const useUserStore = defineStore("userStore", () => {
  const user = ref<UserWithPermissions>();
  const authenticated = ref(false);

  // Écoute les événements OIDC pour maintenir l'état d'authentification à jour
  USER_MANAGER.events.addUserLoaded(() => {
    authenticated.value = true;
    fetchUser();
  });
  USER_MANAGER.events.addUserUnloaded(() => {
    authenticated.value = false;
    user.value = undefined;
  });

  // Initialise l'état d'authentification au démarrage
  USER_MANAGER.getUser().then((oidcUser) => {
    authenticated.value = !!oidcUser;
    if (oidcUser) {
      fetchUser();
    }
  });

  const userRole = computed(() => {
    return user.value ? user.value.role : Roles.VISITOR;
  });

  async function fetchUser() {
    const response = await client.userControllerFindMe();
    if (response.data && response.response.ok) {
      user.value = response.data;
    }
  }

  async function updateEmailPreferences(emailNotificationsEnabled: boolean) {
    const response = await client.userControllerUpdateMe({
      body: { emailNotificationsEnabled },
    });

    if (response.data && response.response.ok) {
      user.value = response.data;
    }
  }

  function isSubscribed(appId: string): boolean {
    return user.value?.followedApplications?.some((app: UserFollowedApplicationDto) => app.id === appId) ?? false;
  }

  async function subscribeToApp(appId: string) {
    const response = await client.userControllerSubscribe({
      path: { appId },
    });

    if (response.data && response.response.ok) {
      user.value = response.data;
    }
  }

  async function unsubscribeFromApp(appId: string) {
    const response = await client.userControllerUnsubscribe({
      path: { appId },
    });

    if (response.data && response.response.ok) {
      user.value = response.data;
    }
  }

  function getBusinessDivisionId(): string | null {
    return user.value?.organization?.businessDivisionId ?? null;
  }

  function hasPermissions(permissions: Permission[], userApplicationPerms?: APP_PERMISSIONS[]) {
    if (permissions.length === 0) return true;
    const userPermissions = new Set([
      ...(user.value?.permissions ?? []),
      ...(user.value?.additionalPermissions ?? []),
      ...Array.from(userApplicationPerms ?? []),
    ]);
    return Array.from(userPermissions).some((userPermission) => permissions.includes(userPermission));
  }

  return {
    user,
    userRole,
    authenticated,
    fetchUser,
    updateEmailPreferences,
    isSubscribed,
    subscribeToApp,
    unsubscribeFromApp,
    getBusinessDivisionId,
    hasPermissions,
  };
});
