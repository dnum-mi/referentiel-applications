import type { Application } from "@/models/Application";

/**
 * Une application n'a pas d'indice de qualité (IQ) lorsqu'elle est décommissionnée
 * ou supprimée (cf. backend `updateApplicationQuality`, qui force `quality` à `null`
 * dans ce cas). Reflète cette même règle côté affichage.
 */
export function hasQualityIndex(application: Pick<Application, "quality">): boolean {
  return application.quality != null;
}
