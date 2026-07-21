/**
 * Catalogue des feature flags connus.
 *
 * Chaque flag est identifié par une clé technique stable, partagée entre le
 * backend (garde `@FeatureFlag`, service `isEnabled`) et le front (store,
 * composable `useFeatureFlag`, directive `v-feature`, miroir
 * `frontend/src/constants/feature-flags.ts` à maintenir à l'identique — un test
 * e2e vérifie la correspondance). Ajouter un flag = ajouter une entrée ici : la
 * synchronisation au démarrage du backend (`syncFeatureFlagCatalog`, appelée
 * par `FeatureFlagService.onModuleInit` et par le seed) le fait apparaître dans
 * TOUS les environnements — y compris la production, où le seed ne tourne
 * jamais — sans écraser l'état déjà basculé en base.
 *
 * La déclaration d'accessibilité (mention légale RGAA, obligatoire sur tout le
 * site) n'est volontairement PAS flaggable.
 *
 * `defaultEnabled` fixe l'état à la CRÉATION uniquement : `true` pour les
 * fonctionnalités déjà en production (ne rien masquer une fois le flag câblé),
 * `false` pour l'expérimental. `FEATURE_FLAGS_DEFAULTS` (env, liste de clés)
 * pré-active en plus, à chaque démarrage, les flags listés qu'aucun admin n'a
 * encore basculés — elle ne désactive jamais et n'écrase jamais un choix humain.
 */
export const FeatureFlagKey = {
  // — Fonctions transverses —
  /** Barre de recherche rapide du header (recherche plein texte, ticket 1753). */
  FULLTEXT_SEARCH: "fulltext-search",
  /** Impersonation d'un utilisateur par un administrateur. */
  IMPERSONATION: "impersonation",
  /** Import Excel / traitement par lot des applications. */
  EXCEL_IMPORT: "excel-import",
  /** Notifications par email (validation, suivi). */
  EMAIL_NOTIFICATIONS: "email-notifications",

  // — Domaines fonctionnels (onglets fiche application & pages) —
  /** Catalogue de données (onglet « Données » + pages data). */
  DATA_CATALOG: "data-catalog",
  /** Stack technique par technologie (onglet + intégration fin de vie). */
  TECHNOLOGY_STACK: "technology-stack",
  /** Conformités (onglet « Conformités »). */
  COMPLIANCES: "compliances",
  /** Acteurs de l'application (onglet « Acteurs »). */
  ACTORS: "actors",
  /** Relations entre applications (onglet « Relations »). */
  RELATIONS: "relations",
  /** Liens externes (onglet « Liens »). */
  LINKS: "links",
  /** Signalements (onglet « Signalements » + page dédiée). */
  REPORTS: "reports",
  /** Historique des modifications (onglet « Modifications »). */
  APPLICATION_HISTORY: "application-history",
  /** Tableau de bord Qualité (onglet + page Qualité). */
  QUALITY_DASHBOARD: "quality-dashboard",

  // — Administration —
  /** Campagnes de dette IT (onglet admin + sélecteur de millésime). */
  MDIT_CAMPAIGNS: "mdit-campaigns",
  /** Gestion des tags (onglet admin). */
  TAGS_MANAGEMENT: "tags-management",
  /** Matrice des permissions (onglet admin). */
  PERMISSIONS_MATRIX: "permissions-matrix",
  /** Gestion des tokens d'API (onglet admin). */
  API_TOKENS: "api-tokens",
} as const;

export type FeatureFlagKey =
  (typeof FeatureFlagKey)[keyof typeof FeatureFlagKey];

/** Définition d'un flag pour le seed et l'affichage admin. */
export interface FeatureFlagDefinition {
  key: FeatureFlagKey;
  label: string;
  description?: string;
  /** État appliqué à la création (jamais à la mise à jour). */
  defaultEnabled: boolean;
}

/**
 * Catalogue exhaustif, source de la synchronisation au démarrage
 * (`syncFeatureFlagCatalog`). Le libellé et la description sont (ré)alignés à
 * chaque boot ; l'état `enabled` d'un flag déjà basculé n'est jamais écrasé.
 */
export const FEATURE_FLAG_CATALOG: readonly FeatureFlagDefinition[] = [
  {
    key: FeatureFlagKey.FULLTEXT_SEARCH,
    label: "Recherche full-text",
    description:
      "Barre de recherche rapide du header (recherche plein texte, ticket 1753).",
    // La recherche est déjà en production : activée par défaut.
    defaultEnabled: true,
  },
  {
    key: FeatureFlagKey.IMPERSONATION,
    label: "Impersonation",
    description:
      "Autorise un administrateur à se faire passer pour un autre utilisateur.",
    defaultEnabled: true,
  },
  {
    key: FeatureFlagKey.EXCEL_IMPORT,
    label: "Import Excel",
    description:
      "Import et traitement par lot des applications via fichier Excel.",
    defaultEnabled: true,
  },
  {
    key: FeatureFlagKey.EMAIL_NOTIFICATIONS,
    label: "Notifications email",
    description: "Envoi des notifications par email (validation, suivi).",
    defaultEnabled: true,
  },
  {
    key: FeatureFlagKey.DATA_CATALOG,
    label: "Catalogue de données",
    description:
      "Onglet « Données » de la fiche application et pages du catalogue.",
    defaultEnabled: true,
  },
  {
    key: FeatureFlagKey.TECHNOLOGY_STACK,
    label: "Stack technique",
    description:
      "Onglet « Stack technique » par technologie et intégration fin de vie.",
    defaultEnabled: true,
  },
  {
    key: FeatureFlagKey.COMPLIANCES,
    label: "Conformités",
    description: "Onglet « Conformités » de la fiche application.",
    defaultEnabled: true,
  },
  {
    key: FeatureFlagKey.ACTORS,
    label: "Acteurs",
    description: "Onglet « Acteurs » de la fiche application.",
    defaultEnabled: true,
  },
  {
    key: FeatureFlagKey.RELATIONS,
    label: "Relations",
    description: "Onglet « Relations » entre applications.",
    defaultEnabled: true,
  },
  {
    key: FeatureFlagKey.LINKS,
    label: "Liens",
    description: "Onglet « Liens » externes de la fiche application.",
    defaultEnabled: true,
  },
  {
    key: FeatureFlagKey.REPORTS,
    label: "Signalements",
    description: "Onglet « Signalements » et page dédiée.",
    defaultEnabled: true,
  },
  {
    key: FeatureFlagKey.APPLICATION_HISTORY,
    label: "Historique des modifications",
    description:
      "Onglet « Modifications » de la fiche application et historique global.",
    defaultEnabled: true,
  },
  {
    key: FeatureFlagKey.QUALITY_DASHBOARD,
    label: "Tableau de bord Qualité",
    description: "Onglet et page Qualité (indicateurs).",
    defaultEnabled: true,
  },
  {
    key: FeatureFlagKey.MDIT_CAMPAIGNS,
    label: "Campagnes de dette IT",
    description:
      "Onglet d'administration des campagnes et sélecteur de millésime.",
    defaultEnabled: true,
  },
  {
    key: FeatureFlagKey.TAGS_MANAGEMENT,
    label: "Gestion des tags",
    description: "Onglet d'administration des tags.",
    defaultEnabled: true,
  },
  {
    key: FeatureFlagKey.PERMISSIONS_MATRIX,
    label: "Matrice des permissions",
    description: "Onglet d'administration de la matrice des permissions.",
    defaultEnabled: true,
  },
  {
    key: FeatureFlagKey.API_TOKENS,
    label: "Tokens d'API",
    description: "Onglet d'administration des tokens d'API.",
    defaultEnabled: true,
  },
];
