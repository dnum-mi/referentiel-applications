import { Injectable } from "@nestjs/common";
import { Permission } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { Requestor } from "src/user/entities/user.entity";
import {
  APP_PERMISSIONS,
  transformAppPermissionsObjectToArray,
} from "../utils/types";
import {
  READ_APP_PERMISSIONS,
  roleToAppPermissions,
} from "src/permissions/role-to-permissions";
import { QueryBuilderGroupActor } from "./prisma-query-builder.service";
import { organizationWithinScope } from "src/common/utils/organization-scope.utils";
import { emailEquals } from "src/common/utils/email.utils";

/** Permissions applicatives conservées par une session rétrogradée (#1985) : lectures seules. */
const STEP_DOWN_APP_PERMISSIONS: ReadonlySet<string> = READ_APP_PERMISSIONS;

@Injectable()
export class CheckPermissions {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBuilderGroupActor: QueryBuilderGroupActor,
  ) {}

  async can(
    permissions: Permission[],
    user: Requestor,
    applicationId?: string,
  ): Promise<boolean> {
    if (!permissions?.length) return true;
    if (applicationId) {
      user.appPerms = await this.resolveAppPermissions(applicationId, user);
    }
    const userPermissions = new Set([
      ...user.permissions,
      ...user.additionalPermissions,
      ...(user.appPerms ?? []),
    ]);
    const hasPermissions = Array.from(userPermissions).some((userPermission) =>
      permissions.includes(userPermission),
    );
    return hasPermissions;
  }

  /**
   * Permissions applicatives (couche 3) de l'utilisateur sur une application : types d'acteur
   * par e-mail et par groupe (ou type par défaut), plus la projection du rôle si l'application
   * relève de son périmètre. Point d'entrée unique pour la garde ET pour `my-perms` (#2510).
   */
  async resolveAppPermissions(
    applicationId: string,
    user: Requestor,
  ): Promise<APP_PERMISSIONS[]> {
    const [actorPermissions, userRolePermissions] = await Promise.all([
      this.getUserAppPermissions(applicationId, user),
      this.getUserRolePermissions(applicationId, user),
    ]);
    const permissions = [...actorPermissions, ...userRolePermissions];
    // #1985 : la couche 3 ne dépend ni du rôle ni du périmètre (acteur par e-mail ou par
    // groupe, type par défaut) : elle survit à la réécriture du principal. Sous session
    // faible, un « utilisateur standard » ne conserve que les LECTURES sur ses applications —
    // sans ce point de coupe unique, le mot de passe seul d'un acteur suffirait à écrire sur
    // ses fiches et à s'ajouter comme acteur. AppRead / ReportRead / ReportPost, absents de
    // READ_APP_PERMISSIONS, restent couverts par le socle global du rôle VISITOR.
    return user.authLevel?.downgraded
      ? permissions.filter((permission) =>
          STEP_DOWN_APP_PERMISSIONS.has(permission),
        )
      : permissions;
  }

  private async getUserAppPermissions(applicationId: string, user: Requestor) {
    const userOrganization: string | null = user.organization?.path ?? null;

    const [emailActors, groupActors] = await Promise.all([
      this.prisma.actor.findMany({
        // #2501 : rapprochement insensible à la casse (acteur saisi à la main vs e-mail SSO).
        where: {
          applicationId,
          email: emailEquals(user.email),
          isGroup: false,
        },
        include: { actorType: { include: { appPermissions: true } } },
        distinct: ["actorTypeId"],
      }),
      userOrganization === null
        ? Promise.resolve([])
        : this.prisma.$queryRaw<{ actorTypeId: string }[]>(
            this.queryBuilderGroupActor.buildByApplication(applicationId, user),
          ),
    ]);

    const groupActorTypes =
      groupActors.length > 0
        ? await this.prisma.actorType.findMany({
            where: { id: { in: groupActors.map((a) => a.actorTypeId) } },
            include: { appPermissions: true },
          })
        : [];

    // Aucun Actor ne correspond (ni par email, ni par groupe/organisation) : l'utilisateur
    // hérite des droits du type d'acteur système par défaut (isDefault), pilotés comme tout
    // autre type via la matrice AppPermissions éditable.
    if (emailActors.length === 0 && groupActorTypes.length === 0) {
      return this.getDefaultActorTypePermissions();
    }

    return [
      ...emailActors.flatMap((actor) =>
        actor.actorType.appPermissions.flatMap((perm) =>
          transformAppPermissionsObjectToArray(perm),
        ),
      ),
      ...groupActorTypes.flatMap((actorType) =>
        actorType.appPermissions.flatMap((perm) =>
          transformAppPermissionsObjectToArray(perm),
        ),
      ),
    ];
  }

  private async getDefaultActorTypePermissions(): Promise<APP_PERMISSIONS[]> {
    const defaultPermissions = await this.prisma.appPermissions.findFirst({
      where: { actorType: { isDefault: true } },
    });
    return defaultPermissions
      ? transformAppPermissionsObjectToArray(defaultPermissions)
      : [];
  }

  private async getUserRolePermissions(
    applicationId: string,
    user: Requestor,
  ): Promise<APP_PERMISSIONS[]> {
    // If user has no scope, it has all app permissions related to its role, otherwise we check if there is an actor with the same scope as the user, if there is, it has all app permissions related to its role, if not, it has no permission
    const scopedPermissions: string | undefined = user?.scopeOrganization?.path;
    if (!scopedPermissions) return roleToAppPermissions(user.role);
    const actorsFromScope = await this.prisma.actor.findMany({
      where: {
        applicationId,
        organization: organizationWithinScope(scopedPermissions),
      },
      distinct: ["actorTypeId"],
    });

    if (actorsFromScope.length > 0) {
      return roleToAppPermissions(user.role);
    }

    const hasMatchingBusinessDivision = await this.hasBusinessDivisionScope(
      applicationId,
      scopedPermissions,
    );

    if (hasMatchingBusinessDivision) {
      return roleToAppPermissions(user.role);
    }

    return [];
  }

  private async hasBusinessDivisionScope(
    applicationId: string,
    scopedPermissions: string,
  ): Promise<boolean> {
    const businessDivision = await this.prisma.businessDivision.findFirst({
      where: {
        applications: {
          some: { id: applicationId },
        },
        organizations: {
          some: organizationWithinScope(scopedPermissions),
        },
      },
      include: {
        organizations: true,
      },
    });

    return !!businessDivision;
  }
}
