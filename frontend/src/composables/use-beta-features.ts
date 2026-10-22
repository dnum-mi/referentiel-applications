import { ref } from "vue";
import { Permission, type FeatureId } from "@/client";
import { getConfig } from "@/services/config";
import { useUserStore } from "@/stores/userStore";

/** Le registre backend décide seul quelles fonctionnalités nécessitent encore la capacité bêta. */
export function useBetaFeatures() {
  const userStore = useUserStore();
  const betaFeatures = ref<FeatureId[]>();
  const accessRefreshFailed = ref(false);

  async function refreshConfiguration(refresh = false) {
    try {
      const config = await getConfig({ refresh });
      betaFeatures.value = config instanceof Error || !Array.isArray(config.betaFeatures) ? undefined : config.betaFeatures;
    } catch {
      betaFeatures.value = undefined;
    }
  }

  function isBeta(feature: FeatureId) {
    return betaFeatures.value?.includes(feature) ?? false;
  }

  function canAccess(feature: FeatureId) {
    return (
      betaFeatures.value !== undefined &&
      !accessRefreshFailed.value &&
      (!isBeta(feature) || userStore.hasPermissions([Permission.BETA_FEATURES]))
    );
  }

  async function refreshAccess() {
    const [permissions] = await Promise.allSettled([userStore.fetchUser(), refreshConfiguration(true)]);
    accessRefreshFailed.value = permissions.status !== "fulfilled" || permissions.value !== true;
    return !accessRefreshFailed.value && betaFeatures.value !== undefined;
  }

  async function authorize(feature: FeatureId, requiredPermissions: Permission[] = []) {
    if (!canAccess(feature)) return false;
    if (!(await refreshAccess())) return false;
    // hasPermissions applique un OU ; vérifier chaque droit séparément impose leur cumul.
    return canAccess(feature) && requiredPermissions.every((permission) => userStore.hasPermissions([permission]));
  }

  void refreshConfiguration();

  return { isBeta, canAccess, authorize, refreshAccess };
}
