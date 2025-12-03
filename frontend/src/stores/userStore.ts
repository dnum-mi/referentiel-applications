import type { UserEntity, UserFollowedApplicationDto } from "@/client/types.gen";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import client from "@/api/index";
import { getAuthentication } from "@/services/authentication";

export const useUserStore = defineStore("userStore", () => {
  const user = ref<UserEntity>();
  const authenticated = ref(getAuthentication().authenticated);
  const adminLevel = computed(() => {
    return user.value ? user.value.adminLevel : 0;
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

  return {
    user,
    adminLevel,
    authenticated,
    fetchUser,
    updateEmailPreferences,
    isSubscribed,
    subscribeToApp,
    unsubscribeFromApp,
  };
});
