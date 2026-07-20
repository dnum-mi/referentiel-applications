import { computed, type ComputedRef } from "vue";
import { useFeatureFlagStore } from "@/stores/featureFlagStore";

/**
 * Réactif : indique si le feature flag `key` est activé. Alimenté par la config
 * chargée au boot ; suit les bascules faites depuis l'écran d'admin.
 */
export function useFeatureFlag(key: string): ComputedRef<boolean> {
  const store = useFeatureFlagStore();
  return computed(() => store.isEnabled(key));
}
