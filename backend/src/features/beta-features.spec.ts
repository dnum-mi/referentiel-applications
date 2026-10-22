import { BETA_FEATURES, FeatureId, isBetaFeature } from "./beta-features";

describe("Registre des fonctionnalités bêta", () => {
  it("déclare les fonctionnalités attendues sans doublon", () => {
    expect(BETA_FEATURES).toEqual([
      FeatureId.CatalogueExcelExport,
      FeatureId.CatalogueHtmlExport,
      FeatureId.ImportReportHtmlExport,
      FeatureId.ProductHtmlExport,
      FeatureId.ProductPowerpointExport,
    ]);
    expect(new Set(BETA_FEATURES).size).toBe(BETA_FEATURES.length);
  });

  it("conserve un identifiant stable après son retrait de la liste bêta", () => {
    const released = FeatureId.ProductHtmlExport;
    const remainingBetaFeatures = BETA_FEATURES.filter((id) => id !== released);
    expect(isBetaFeature(released)).toBe(true);
    expect(isBetaFeature(released, remainingBetaFeatures)).toBe(false);
    expect(Object.values(FeatureId)).toContain(released);
    expect(
      isBetaFeature(FeatureId.CatalogueExcelExport, remainingBetaFeatures),
    ).toBe(true);
  });
});
