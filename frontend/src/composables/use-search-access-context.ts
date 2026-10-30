import { computed } from "vue";
import { useUserStore } from "@/stores/userStore";

/** Invalide les résultats liés au profil, sans reproduire les droits calculés par fiche côté API. */
export function useSearchAccessContext() {
  const userStore = useUserStore();
  return computed(() => {
    const user = userStore.user;
    return JSON.stringify([
      userStore.hasApplicationAccess,
      user?.id,
      user?.email?.toLowerCase(),
      user?.role,
      user?.type,
      user?.organizationId,
      user?.organization?.path,
      user?.scopeOrganizationId,
      user?.scopeOrganization?.path,
      [...new Set(user?.permissions ?? [])].sort(),
      [...new Set(user?.additionalPermissions ?? [])].sort(),
    ]);
  });
}
