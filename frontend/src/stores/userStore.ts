import type { UserEntity, UserFollowedApplicationDto } from "@/client/types.gen";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import client from "@/api/index";
import { USER_MANAGER } from "@/services/authentication";

export const useUserStore = defineStore("userStore", () => {
  const user = ref<UserEntity>();
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

  const adminLevel = computed(() => {
    return user.value ? user.value.adminLevel : 0;
  });

  async function fetchUser() {
    const response = await client.userControllerFindMe();
    if (response.data && response.response.ok) {
      user.value = response.data as UserEntity;
    }
  }

  async function updateEmailPreferences(emailNotificationsEnabled: boolean) {
    const response = await client.userControllerUpdateMe({
      body: { emailNotificationsEnabled },
    });

    if (response.data && response.response.ok) {
      user.value = response.data as UserEntity;
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
      user.value = response.data as UserEntity;
    }
  }

  async function unsubscribeFromApp(appId: string) {
    const response = await client.userControllerUnsubscribe({
      path: { appId },
    });

    if (response.data && response.response.ok) {
      user.value = response.data as UserEntity;
    }
  }

  function getBusinessDivisionId(): string | null {
    return user.value?.organization?.businessDivisionId ?? null;
  }

  return {
    user,
    adminLevel,
    authenticated,
    fetchUser,
    updateEmailPreferences,
    isSubscribed,
    subscribeToApp,
    unsubscribeFromApp,
    getBusinessDivisionId,
  };
});
