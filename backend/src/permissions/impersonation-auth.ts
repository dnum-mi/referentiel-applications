import { Roles } from "@prisma/client";
import { isPathWithinScope } from "src/common/utils/organization-scope.utils";
import type { Requestor, UserEntity } from "src/user/entities/user.entity";
import { ScopePermissionsException } from "src/user/errors/scope-permissions.exception";
import { principalToPermissions } from "./role-to-permissions";

/** Contexte serveur non sérialisable : plafond applicatif de l'impersonation. */
export const IMPERSONATION_AUTH = Symbol("impersonation-auth");

export interface ImpersonationAuth {
  admin: Requestor;
  target: Requestor;
}

/**
 * L'identité cible reste visible, mais ne peut pas étendre les capacités ni la
 * portée de l'administrateur réel. Les droits d'acteur sont plafonnés à la
 * requête par CheckPermissions, à partir des deux identités originales.
 */
export function impersonateWithinCeiling(
  admin: Requestor,
  targetUser: UserEntity,
): Requestor {
  if (admin.role !== Roles.ADMIN) {
    throw new ScopePermissionsException(
      "Cette action est réservée aux administrateurs",
    );
  }
  const target: Requestor = {
    ...targetUser,
    permissions: principalToPermissions(targetUser),
  };
  const scope = admin.scopeOrganization;
  if (!scope?.path) {
    if (admin.scopeOrganizationId) {
      throw new ScopePermissionsException("Périmètre d'impersonation invalide");
    }
    return target;
  }

  if (!isPathWithinScope(target.organization?.path, scope.path)) {
    throw new ScopePermissionsException(
      "Vous n'avez pas les permissions pour impersonner cet utilisateur",
    );
  }
  if (target.scopeOrganizationId && !target.scopeOrganization?.path) {
    throw new ScopePermissionsException("Périmètre d'impersonation invalide");
  }
  if (
    target.scopeOrganization?.path &&
    !isPathWithinScope(target.scopeOrganization.path, scope.path)
  ) {
    throw new ScopePermissionsException(
      "Le périmètre de l'utilisateur cible dépasse le vôtre",
    );
  }

  const adminPermissions = new Set([
    ...(admin.permissions ?? principalToPermissions(admin)),
    ...admin.additionalPermissions,
  ]);
  const targetPermissions = [
    ...target.permissions,
    ...target.additionalPermissions,
  ];
  if (
    targetPermissions.some((permission) => !adminPermissions.has(permission))
  ) {
    throw new ScopePermissionsException(
      "Les permissions de l'utilisateur cible dépassent les vôtres",
    );
  }

  const effectiveScope = target.scopeOrganization ?? scope;
  return {
    ...target,
    scopeOrganizationId: effectiveScope.id,
    scopeOrganization: effectiveScope,
    [IMPERSONATION_AUTH]: { admin, target },
  };
}
