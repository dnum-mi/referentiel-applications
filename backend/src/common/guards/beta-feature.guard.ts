import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Permission } from "@prisma/client";
import { FeatureId, isBetaFeature } from "src/features/beta-features";
import type { Requestor } from "src/user/entities/user.entity";
import { REQUIRED_BETA_FEATURE } from "../decorators/beta-feature.metadata";
import { CheckPermissions } from "../service/check-permissions.service";

@Injectable()
export class BetaFeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly checkPermissions: CheckPermissions,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureId = this.reflector.getAllAndOverride<FeatureId>(
      REQUIRED_BETA_FEATURE,
      [context.getHandler(), context.getClass()],
    );
    if (!featureId || !isBetaFeature(featureId)) return true;

    // Le middleware d'authentification relit les droits en base à chaque requête.
    // Cette capacité globale n'est jamais accordée par un acteur sur une application.
    const { user } = context.switchToHttp().getRequest<{ user?: Requestor }>();
    if (
      user &&
      (await this.checkPermissions.can([Permission.BetaFeatures], user))
    ) {
      return true;
    }
    throw new ForbiddenException({
      statusCode: 403,
      error: "Forbidden",
      message:
        "Cette fonctionnalité en bêta nécessite la permission BetaFeatures.",
      betaFeatureRequired: true,
      featureId,
    });
  }
}
