import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { APP_ACTION_KEY } from "../decorators/application.decorator";
import type { User } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { APP_PERMISSIONS, APP_PERMS_MAP, AppPermissionsRecord } from "../utils/types";
import { AdminLevel, UserEntity } from "src/user/entities/user.entity";

@Injectable()
export class ApplicationGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action = this.reflector.get<string>(
      APP_ACTION_KEY,
      context.getHandler(),
    );

    const request = context.switchToHttp().getRequest();

    const user = request.user as UserEntity;
    const { params } = request;

    const appPermsMap = await this.getUserAppPermissions(
      params.applicationId,
      user,
    );
    user.appPerms = Array.from(appPermsMap);
    const authorized = await this.checkAppPermission(
      user,
      action as APP_PERMISSIONS,
    );

    return authorized;
  }

  private async getUserAppPermissions(
    applicationId: string,
    user: User,
  ): Promise<APP_PERMS_MAP> {
    const [actors, application] = await Promise.all([
      this.prisma.actor.findMany({
        where: {
          applicationId,
          email: user.email,
        },
        include: {
          actorType: {
            include: {
              appPermissions: {
                omit: {
                  actorTypeId: true,
                },
              },
            },
          },
        },
        distinct: ["actorTypeId"],
      }),
      this.prisma.application.findUnique({
        where: { id: applicationId },
      }),
    ]);
    // reduce the permissions to a map

    const appPermsSet = new Set<APP_PERMISSIONS>();
    if (application?.ownerId === user.keycloakId || user.adminLevel >= AdminLevel.WRITE) {
      Object.keys(AppPermissionsRecord).forEach((key) => {
        appPermsSet.add(key as APP_PERMISSIONS);
      });
      return appPermsSet;
    }
    if (user.adminLevel >= AdminLevel.READ) {
      Object.keys(AppPermissionsRecord)
        .filter(key => key.startsWith("read"))
        .forEach((key) => {
          appPermsSet.add(key as APP_PERMISSIONS);
        });
    }
    actors.forEach((actor) => {
      if (!actor.actorType) {
        return;
      }
      Object.values(actor.actorType.appPermissions).forEach((actor) => {
        Object.entries(actor).forEach(([key, value]) => {
          if (key === "actorTypeId") return;
          if (value === true) {
            appPermsSet.add(key as APP_PERMISSIONS);
            if (key === "manageAnomalyNotifications") {
              appPermsSet.add("readAnomalyNotifications");
              appPermsSet.add("postAnomalyNotifications");
            }
          }
        });
      });
    });

    return appPermsSet;
  }

  private async checkAppPermission(
    user: UserEntity,
    action?: APP_PERMISSIONS,
  ): Promise<boolean> {
    if (typeof action === "undefined") {
      return true;
    }
    if (user.adminLevel >= AdminLevel.WRITE) return true;
    if (action.startsWith("read") && user.adminLevel >= AdminLevel.READ)
      return true;

    return (user.appPerms.includes(action)) ?? false;
  }
}
