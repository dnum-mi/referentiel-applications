import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Requestor } from "src/user/entities/user.entity";

/**
 * Condition « l'organisation `o` couvre le périmètre de l'utilisateur », c'est-à-dire
 * `o.path` est le path de l'utilisateur ou l'un de ses ancêtres.
 *
 * #2370 : l'ancrage sur le séparateur `/` est indispensable. Un simple
 * `LIKE o.path || '%'` fait un match de sous-chaîne : une organisation `/SG`
 * couvrirait `/SGAMI`, et `/SGAMI/SU` couvrirait `/SGAMI/SUD` — bien au-delà de la
 * filiation réelle. Insensible à la casse.
 */
function organizationCoversUser(userOrganization: string | null): Prisma.Sql {
  return Prisma.sql`(
    lower(${userOrganization}) = lower(o.path)
    OR lower(${userOrganization}) LIKE lower(o.path) || '/%'
  )`;
}

/**
 * Sous-requêtes SQL résolvant les acteurs « groupe » qui couvrent l'utilisateur
 * via son organisation (un acteur groupe rattaché à une organisation ancêtre du
 * périmètre de l'utilisateur lui accorde les droits de son type d'acteur).
 *
 * SÉCURITÉ (#2366) : ces requêtes sont exécutées via `$queryRaw` avec des paramètres
 * `Prisma.sql`, JAMAIS via `$queryRawUnsafe` avec interpolation de chaîne. `applicationId`
 * provient d'un paramètre d'URL et `user.organization.path` d'une donnée persistée :
 * interpolés bruts, ils permettaient une injection SQL par tout utilisateur authentifié
 * (le `PermissionGuard` s'exécute avant les pipes de validation, un `ParseUUIDPipe`
 * serait donc inopérant). `o.path` reste une colonne (non paramétrable).
 */
@Injectable()
export class QueryBuilderGroupActor {
  /**
   * Types d'acteur accordés à l'utilisateur SUR UNE APPLICATION DONNÉE. La restriction
   * à `applicationId` porte ici tout le cloisonnement : ne remonter que le type est
   * donc sans danger, contrairement à `buildApplicationIds`.
   */
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
        AND ${organizationCoversUser(userOrganization)}
    `;
  }

  /**
   * Applications couvertes par un acteur groupe porté par une organisation ancêtre de
   * l'utilisateur — le socle du filtre « Mes applications ».
   *
   * Renvoie des `applicationId`, et NON des `actorTypeId`. `ActorType` est une table de
   * référence globale (MOA, MOE, RSSI…) sans lien d'organisation : ne remonter que le
   * type perdait tout rattachement au périmètre, et le filtre appariait alors chaque
   * application portant un acteur groupe du même type, quelle que soit son organisation.
   * Un utilisateur voyait ainsi les applications d'autres services listées comme siennes.
   */
  public buildApplicationIds(user: Requestor): Prisma.Sql {
    const userOrganization: string | null = user.organization?.path ?? null;
    return Prisma.sql`
      SELECT DISTINCT a."applicationId"
      FROM "Actor" a
      JOIN "Organization" o ON o.id = a."organizationId"
      WHERE a."isGroup" = true
        AND a."applicationId" IS NOT NULL
        AND ${organizationCoversUser(userOrganization)}
    `;
  }
}
