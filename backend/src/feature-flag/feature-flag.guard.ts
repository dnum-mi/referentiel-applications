import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { FEATURE_FLAG_KEY } from "src/common/decorators/feature-flag.decorator";
import { FeatureFlagService } from "./feature-flag.service";
import { FeatureFlagKey } from "./feature-flag.keys";

/**
 * Protège un endpoint marqué par `@FeatureFlag(key)`. Si le flag est désactivé,
 * la route renvoie 404 (plutôt que 403) pour ne pas divulguer l'existence d'une
 * fonctionnalité coupée.
 */
@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureFlagService: FeatureFlagService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const key = this.reflector.get<FeatureFlagKey | undefined>(
      FEATURE_FLAG_KEY,
      context.getHandler(),
    );
    if (!key) return true;

    const enabled = await this.featureFlagService.isEnabled(key);
    if (!enabled) {
      throw new NotFoundException();
    }
    return true;
  }
}
