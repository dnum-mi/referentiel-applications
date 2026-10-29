import { ref } from "vue";
import { Permission, type FeatureId } from "@/client";
import { getConfig } from "@/services/config";
import { useUserStore } from "@/stores/userStore";

/** Le registre backend décide seul quelles fonctionnalités nécessitent encore la capacité bêta. */
export function useBetaFeatures() {
  const userStore = useUserStore();
  const betaFeatures = ref<FeatureId[]>();

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
      !userStore.accessRefreshFailed &&
      (!isBeta(feature) || userStore.hasPermissions([Permission.BETA_FEATURES]))
    );
  }

  async function refreshAccess() {
    const [permissions] = await Promise.allSettled([userStore.fetchUser(), refreshConfiguration(true)]);
    // Un false peut désigner une réponse périmée : le store conserve le verdict
    // de la revalidation courante. Le clic dépassé reste annulé.
    return (
      permissions.status === "fulfilled" && permissions.value === true && !userStore.accessRefreshFailed && betaFeatures.value !== undefined
    );
  }

  async function authorize(feature: FeatureId, requiredPermissions: Permission[] = []) {
    if (!canAccess(feature)) return false;
    if (!(await refreshAccess())) return false;
    // hasPermissions applique un OU ; vérifier chaque droit séparément impose leur cumul.
    return canAccess(feature) && requiredPermissions.every((permission) => userStore.hasPermissions([permission]));
  }

  // Le démarrage OIDC peut avoir mis en cache un registre antérieur au déploiement.
  // Relire au montage garde le backend autoritaire ; getConfig déduplique les appels simultanés.
  void refreshConfiguration(true);

  return { isBeta, canAccess, authorize, refreshAccess };
}
