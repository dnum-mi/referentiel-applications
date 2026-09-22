import { ForbiddenException } from "@nestjs/common";
import { Permission, Roles } from "@prisma/client";
import { isPathWithinScope } from "src/common/utils/organization-scope.utils";
import type { Requestor, UserEntity } from "src/user/entities/user.entity";
import { principalToPermissions } from "./role-to-permissions";

/** Contexte interne : un symbole ne se sérialise jamais dans les réponses JSON. */
export const DELEGATED_AUTH = Symbol("delegated-auth");

export interface DelegatedAuth {
  human: Requestor;
  service: Requestor;
}

const ROLE_ORDER: Record<Roles, number> = {
  VISITOR: 0,
  READER: 1,
  CONTRIBUTOR: 2,
  ADMIN: 3,
};

export function globalPermissions(user: Requestor): Permission[] {
  return [...(user.permissions ?? []), ...user.additionalPermissions];
}

/**
 * Les services qui lisent directement le rôle ou le périmètre doivent aussi voir
 * leur intersection. Deux périmètres disjoints ne représentent aucun périmètre
 * commun : les refuser évite de convertir cette situation en accès global (null).
 */
export function delegateToService(
  humanUser: UserEntity,
  serviceUser: UserEntity,
): Requestor {
  for (const user of [humanUser, serviceUser]) {
    if (user.scopeOrganizationId && !user.scopeOrganization?.path) {
      throw new ForbiddenException("Périmètre d'authentification invalide.");
    }
  }
  const human: Requestor = {
    ...humanUser,
    permissions: principalToPermissions(humanUser),
  };
  const service: Requestor = {
    ...serviceUser,
    permissions: principalToPermissions(serviceUser),
  };
  let scope = human.scopeOrganization ?? service.scopeOrganization ?? null;
  if (human.scopeOrganization && service.scopeOrganization) {
    if (
      isPathWithinScope(
        human.scopeOrganization.path,
        service.scopeOrganization.path,
      )
    ) {
      scope = human.scopeOrganization;
    } else if (
      isPathWithinScope(
        service.scopeOrganization.path,
        human.scopeOrganization.path,
      )
    ) {
      scope = service.scopeOrganization;
    } else {
      throw new ForbiddenException(
        "Les périmètres de l'utilisateur et du service sont disjoints.",
      );
    }
  }

  const role =
    ROLE_ORDER[human.role] <= ROLE_ORDER[service.role]
      ? human.role
      : service.role;
  const servicePermissions = new Set(globalPermissions(service));
  const common = [...new Set(globalPermissions(human))].filter((permission) =>
    servicePermissions.has(permission),
  );
  const rolePermissions = principalToPermissions({
    role,
    scopeOrganizationId: scope?.id ?? null,
  });

  return {
    ...human,
    role,
    scopeOrganizationId: scope?.id ?? null,
    scopeOrganization: scope,
    permissions: rolePermissions.filter((permission) =>
      common.includes(permission),
    ),
    additionalPermissions: common.filter(
      (permission) => !rolePermissions.includes(permission),
    ),
    [DELEGATED_AUTH]: { human, service },
  };
}
