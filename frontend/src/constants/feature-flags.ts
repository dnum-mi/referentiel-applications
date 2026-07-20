/**
 * Clés techniques des feature flags, miroir du catalogue backend
 * (`backend/src/feature-flag/feature-flag.keys.ts`). Les clés doivent rester
 * strictement identiques de part et d'autre.
 */
export const FeatureFlagKey = {
  FULLTEXT_SEARCH: "fulltext-search",
  IMPERSONATION: "impersonation",
  EXCEL_IMPORT: "excel-import",
  EMAIL_NOTIFICATIONS: "email-notifications",
  DATA_CATALOG: "data-catalog",
  TECHNOLOGY_STACK: "technology-stack",
  COMPLIANCES: "compliances",
  ACTORS: "actors",
  RELATIONS: "relations",
  LINKS: "links",
  REPORTS: "reports",
  APPLICATION_HISTORY: "application-history",
  QUALITY_DASHBOARD: "quality-dashboard",
  RGAA_ACCESSIBILITY: "rgaa-accessibility",
  MDIT_CAMPAIGNS: "mdit-campaigns",
  TAGS_MANAGEMENT: "tags-management",
  PERMISSIONS_MATRIX: "permissions-matrix",
  API_TOKENS: "api-tokens",
} as const;

export type FeatureFlagKey = (typeof FeatureFlagKey)[keyof typeof FeatureFlagKey];
