import { applyDecorators, SetMetadata, UseGuards } from "@nestjs/common";
import { FeatureId } from "src/features/beta-features";
import { BetaFeatureGuard } from "../guards/beta-feature.guard";
import { REQUIRED_BETA_FEATURE } from "./beta-feature.metadata";

export { REQUIRED_BETA_FEATURE } from "./beta-feature.metadata";

/** Contrôle additionnel : les permissions métier de la route restent nécessaires. */
export function RequiresBetaFeature(featureId: FeatureId) {
  return applyDecorators(
    SetMetadata(REQUIRED_BETA_FEATURE, featureId),
    UseGuards(BetaFeatureGuard),
  );
}
