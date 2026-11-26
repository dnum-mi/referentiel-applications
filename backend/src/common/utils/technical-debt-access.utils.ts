import { ForbiddenException } from "@nestjs/common";
import { Permission, Prisma, Roles } from "@prisma/client";
import { DELEGATED_AUTH } from "src/permissions/delegated-auth";
import { IMPERSONATION_AUTH } from "src/permissions/impersonation-auth";
import type { Requestor } from "src/user/entities/user.entity";
import { organizationWithinScope } from "./organization-scope.utils";

/** Le périmètre inclut ses descendants ; le rattachement personnel reste exact. */
export function technicalDebtAccessWhere(
  requestor: Requestor,
): Prisma.ApplicationWhereInput {
  if (!requestor) return { id: { in: [] } };
  const scope = requestor.scopeOrganization?.path;
  if (requestor.scopeOrganizationId && !scope) {
    throw new ForbiddenException("Périmètre d'authentification invalide.");
  }
  const scopeWhere: Prisma.ApplicationWhereInput = scope
    ? {
        OR: [
          {
            actors: { some: { organization: organizationWithinScope(scope) } },
          },
          {
            businessDivisions: {
              some: { organizations: { some: organizationWithinScope(scope) } },
            },
          },
        ],
      }
    : {};

  // Une session déléguée ou impersonnée conserve le plafond des deux identités.
  const delegated = requestor[DELEGATED_AUTH];
  const impersonation = requestor[IMPERSONATION_AUTH];
  if (delegated || impersonation) {
    return {
      AND: [
        scopeWhere,
        technicalDebtAccessWhere(
          delegated ? delegated.human : impersonation.admin,
        ),
        technicalDebtAccessWhere(
          delegated ? delegated.service : impersonation.target,
        ),
      ],
    };
  }

  const hasRole =
    requestor.role === Roles.READER ||
    requestor.role === Roles.CONTRIBUTOR ||
    requestor.role === Roles.ADMIN;
  if (hasRole && !scope) return {};
  if (
    !hasRole &&
    !(requestor.permissions ?? []).includes(Permission.MDITList) &&
    !(requestor.additionalPermissions ?? []).includes(Permission.MDITList)
  ) {
    return { id: { in: [] } };
  }
  if (requestor.type === "bot")
    return hasRole ? scopeWhere : { id: { in: [] } };

  const alternatives: Prisma.ApplicationWhereInput[] = [];
  if (hasRole && scope) alternatives.push(scopeWhere);
  if (requestor.organizationId) {
    alternatives.push({
      actors: { some: { organizationId: requestor.organizationId } },
    });
  }
  const businessDivisionId = requestor.organization?.businessDivisionId;
  if (businessDivisionId) {
    alternatives.push({
      businessDivisions: { some: { id: businessDivisionId } },
    });
  }
  return alternatives.length ? { OR: alternatives } : { id: { in: [] } };
}
