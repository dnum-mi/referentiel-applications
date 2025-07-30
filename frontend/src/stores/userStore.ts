import Users from "@/api/user";
import { defineStore } from "pinia";
import { ref } from "vue";
import type { User } from "@/models/user";
import { authentication } from "@/services/authentication";

export const useUserStore = defineStore("userStore", () => {
  const user = ref<User>();
  const authenticated = ref(authentication.authenticated);
  const adminLevel = computed(() => {
    return user.value ? user.value.adminLevel : 0;
  });

  async function fetchUser() {
    user.value = await Users.getUser();
  }

  return {
    user,
    adminLevel,
    authenticated,
    fetchUser,
  };
});
