import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Requestor } from "src/user/entities/user.entity";

/**
 * Sous-requêtes SQL résolvant les types d'acteur « groupe » qui couvrent l'utilisateur
 * via son organisation (un acteur groupe rattaché à une organisation ancêtre du
 * périmètre de l'utilisateur lui accorde les droits de son type d'acteur).
 *
 * SÉCURITÉ (#2366) : ces requêtes sont exécutées via `$queryRaw` avec des paramètres
 * `Prisma.sql`, JAMAIS via `$queryRawUnsafe` avec interpolation de chaîne. `applicationId`
 * provient d'un paramètre d'URL et `user.organization.path` d'une donnée persistée :
 * interpolés bruts, ils permettaient une injection SQL par tout utilisateur authentifié
 * (le `PermissionGuard` s'exécute avant les pipes de validation, un `ParseUUIDPipe`
 * serait donc inopérant). La sémantique du filtre est inchangée : `o.path` reste une
 * colonne (non paramétrable) et sert de motif de préfixe au `LIKE`.
 */
@Injectable()
export class QueryBuilderGroupActor {
  public buildByApplication(
    applicationId: string,
    user: Requestor,
  ): Prisma.Sql {
    const userOrganization: string | null = user.organization?.path ?? null;
    return Prisma.sql`
      SELECT DISTINCT a."actorTypeId"
      FROM "Actor" a
      JOIN "Organization" o ON o.id = a."organizationId"
      WHERE a."applicationId" = ${applicationId}
        AND a."isGroup" = true
        AND lower(${userOrganization}) LIKE lower(o.path) || '%'
    `;
  }

  public build(user: Requestor): Prisma.Sql {
    const userOrganization: string | null = user.organization?.path ?? null;
    return Prisma.sql`
      SELECT DISTINCT a."actorTypeId"
      FROM "Actor" a
      JOIN "Organization" o ON o.id = a."organizationId"
      WHERE a."isGroup" = true
        AND lower(${userOrganization}) LIKE lower(o.path) || '%'
    `;
  }
}
