import { SetMetadata } from "@nestjs/common";
import { FeatureFlagKey } from "src/feature-flag/feature-flag.keys";

export const FEATURE_FLAG_KEY = "featureFlag";

/**
 * Marque un endpoint comme appartenant à une fonctionnalité gouvernée par un
 * feature flag. Combiné à `FeatureFlagGuard`, l'endpoint renvoie 404 quand le
 * flag est désactivé.
 */
export function FeatureFlag(key: FeatureFlagKey) {
  return SetMetadata(FEATURE_FLAG_KEY, key);
}
