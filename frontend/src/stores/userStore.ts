import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { authentication } from "@/services/authentication";
import client from "@/api/index";
import type { UserEntity } from "@/client/types.gen";

export const useUserStore = defineStore("userStore", () => {
  const user = ref<UserEntity>();
  const authenticated = ref(authentication.authenticated);
  const adminLevel = computed(() => {
    return user.value ? user.value.adminLevel : 0;
  });

  async function fetchUser() {
    const response = await client.userControllerFindMe();
    if (response.data && response.response.ok) {
      user.value = response.data;
    }
  }

  return {
    user,
    adminLevel,
    authenticated,
    fetchUser,
  };
});
