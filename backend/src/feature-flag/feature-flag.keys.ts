/**
 * Catalogue des feature flags connus.
 *
 * Chaque flag est identifié par une clé technique stable, partagée entre le
 * backend (garde `@FeatureFlag`, service `isEnabled`) et le front (store,
 * composable `useFeatureFlag`, directive `v-feature`). Ajouter un flag = ajouter
 * une entrée ici ; le seed (`upsert` par clé) le fera apparaître, désactivé par
 * défaut, sans écraser l'état existant en base.
 */
export const FeatureFlagKey = {
  /** Recherche full-text des applications (ticket 1753). */
  FULLTEXT_SEARCH: "fulltext-search",
} as const;

export type FeatureFlagKey =
  (typeof FeatureFlagKey)[keyof typeof FeatureFlagKey];

/** Définition d'un flag pour le seed et l'affichage admin. */
export interface FeatureFlagDefinition {
  key: FeatureFlagKey;
  label: string;
  description?: string;
}

/**
 * Catalogue exhaustif servant de source au seed. Le libellé et la description
 * sont (ré)appliqués à chaque seed ; l'état `enabled` n'est jamais écrasé.
 */
export const FEATURE_FLAG_CATALOG: readonly FeatureFlagDefinition[] = [
  {
    key: FeatureFlagKey.FULLTEXT_SEARCH,
    label: "Recherche full-text",
    description:
      "Active la recherche plein texte des applications (barre de recherche globale).",
  },
];
