import { Injectable } from "@nestjs/common";
import { Permission } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { Requestor } from "src/user/entities/user.entity";
import { transformAppPermissionsObjectToArray } from "../utils/types";

@Injectable()
export class CheckPermissions {
  constructor(private readonly prisma: PrismaService) {}

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
      user.appPerms = actorPermissions;
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
    const actors = await this.prisma.actor.findMany({
      where: {
        applicationId,
        email: user.email,
      },
      include: {
        actorType: {
          include: {
            appPermissions: true,
          },
        },
      },
      distinct: ["actorTypeId"],
    });

    return actors.flatMap((actor) =>
      actor.actorType.appPermissions.flatMap((perm) =>
        transformAppPermissionsObjectToArray(perm),
      ),
    );
  }
}
