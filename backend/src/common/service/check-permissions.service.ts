import { Injectable } from "@nestjs/common";
import { Permission } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { Requestor } from "src/user/entities/user.entity";
import {
  APP_PERMISSIONS,
  transformAppPermissionsObjectToArray,
} from "../utils/types";
import { roleToAppPermissions } from "src/permissions/role-to-permissions";
import { QueryBuilderGroupActor } from "./prisma-query-builder.service";

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
      const actorPermissions = await this.getUserAppPermissions(
        applicationId,
        user,
      );
      const userRolePermissions = await this.getUserRolePermissions(
        applicationId,
        user,
      );
      user.appPerms = [...actorPermissions, ...userRolePermissions];
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

  private async getUserAppPermissions(applicationId: string, user: Requestor) {
    const userOrganization: string | null = user.organization?.path ?? null;

    const [emailActors, groupActors] = await Promise.all([
      this.prisma.actor.findMany({
        where: { applicationId, email: user.email, isGroup: false },
        include: { actorType: { include: { appPermissions: true } } },
        distinct: ["actorTypeId"],
      }),
      userOrganization === null
        ? Promise.resolve([])
        : this.prisma.$queryRawUnsafe<{ actorTypeId: string }[]>(
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
        organization: {
          path: {
            contains: scopedPermissions,
            mode: "insensitive" as const,
          },
        },
      },
      distinct: ["actorTypeId"],
    });

    if (actorsFromScope.length > 0) {
      return roleToAppPermissions(user.role);
    }

    const businessDivisionFromScope = await this.prisma.application.findFirst({
      where: {
        id: applicationId,
        businessDivision: {
          label: {
            contains: scopedPermissions,
            mode: "insensitive" as const,
          },
        },
      },
    });

    if (businessDivisionFromScope) {
      return roleToAppPermissions(user.role);
    }

    return [];
  }
}
