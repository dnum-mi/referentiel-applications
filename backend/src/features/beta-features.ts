/** Identifiants stables, y compris après la sortie de bêta d'une fonctionnalité. */
export enum FeatureId {
  CatalogueExcelExport = "catalogue-excel-export",
  CatalogueHtmlExport = "catalogue-html-export",
  ImportReportHtmlExport = "import-report-html-export",
  ProductHtmlExport = "product-html-export",
  ProductPowerpointExport = "product-powerpoint-export",
}

/** Registre autoritaire : retirer un identifiant suffit à lever son contrôle bêta. */
export const BETA_FEATURES: readonly FeatureId[] = [
  FeatureId.CatalogueExcelExport,
  FeatureId.CatalogueHtmlExport,
  FeatureId.ImportReportHtmlExport,
  FeatureId.ProductHtmlExport,
  FeatureId.ProductPowerpointExport,
];

export function isBetaFeature(
  featureId: FeatureId,
  betaFeatures: readonly FeatureId[] = BETA_FEATURES,
): boolean {
  return betaFeatures.includes(featureId);
}
