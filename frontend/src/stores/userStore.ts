import Users from "@/api/user";
import type { User } from "@/models/user";
import { authentication } from "@/services/authentication";

export const useUserStore = defineStore("userStore", () => {
  const user = ref<User>();
  const authenticated = ref(authentication.authenticated);
  const userPermissions = computed<string[]>(() => user.value?.permissions.split(",") ?? []);

  async function fetchUser() {
    user.value = await Users.getUser();
  }

  return {
    user,
    authenticated,
    userPermissions,
    fetchUser,
  };
});
