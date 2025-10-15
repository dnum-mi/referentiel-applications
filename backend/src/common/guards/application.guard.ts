import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { APP_ACTION_KEY } from "../decorators/application.decorator";
import { PrismaService } from "src/prisma/prisma.service";
import { APP_PERMISSIONS, APP_PERMS_MAP, AppPermissionsRecord } from "../utils/types";
import { AdminLevel, Requestor } from "src/user/entities/user.entity";

@Injectable()
export class ApplicationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action = this.reflector.get<string>(
      APP_ACTION_KEY,
      context.getHandler(),
    );

    const request = context.switchToHttp().getRequest();

    const user = request.user as Requestor;
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
    user: Requestor,
  ): Promise<APP_PERMS_MAP> {
    const actors = await this.prisma.actor.findMany({
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
    });
    // reduce the permissions to a map

    if (user.adminLevel >= AdminLevel.WRITE) {
      return new Set<APP_PERMISSIONS>(Object.keys(AppPermissionsRecord) as APP_PERMISSIONS[]);
    }
    const appPermsSet = new Set<APP_PERMISSIONS>();
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
    user: Requestor,
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
