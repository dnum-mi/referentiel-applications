import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Requestor } from "src/user/entities/user.entity";

/**
 * Réserve un endpoint aux administrateurs GLOBAUX : un compte restreint à un
 * périmètre (`scopeOrganizationId` non nul) est refusé, même s'il porte la
 * permission requise. À combiner avec `PermissionGuard` (qui vérifie la
 * permission) — cette garde ne vérifie que l'absence de scope.
 *
 * Cas d'usage : le feature flipping, dont l'effet est global à l'application,
 * ne doit pas être pilotable par un administrateur de périmètre.
 */
@Injectable()
export class UnscopedAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: Requestor }>();
    const user = request.user;
    if (!user) return false;
    if (user.scopeOrganizationId) {
      throw new ForbiddenException(
        "Accès réservé aux administrateurs globaux (compte non restreint à un périmètre).",
      );
    }
    return true;
  }
}
