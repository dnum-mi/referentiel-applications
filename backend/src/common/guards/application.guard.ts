import {
  Injectable,
  CanActivate,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { APP_ACTION_KEY } from '../decorators/application.decorator';
import type { User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  APP_PERMISSIONS,
  APP_PERMS_MAP,
  GLOBAL_PERMS_MAP,
} from '../utils/types';

@Injectable()
export class ApplicationGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action = this.reflector.get<string>(
      APP_ACTION_KEY,
      context.getHandler(),
    );

    if (!action) {
      throw new InternalServerErrorException(
        'Server Error: Missing permission check',
      );
    }

    const request = context.switchToHttp().getRequest();

    const { user, params } = request;

    const authorized = await this.checkAppPermission(
      user,
      params.applicationId,
      action as APP_PERMISSIONS,
    );

    if (!authorized) {
      // TODO utiliser le logger de NestJS
      console.log(
        `User ${user.email} is not authorized to perform action ${action} on application ${params.applicationId}`,
      );
      return false;
    }

    return true;
  }

  private getUserGlobalPermissions(user: User): GLOBAL_PERMS_MAP {
    const permList = user.permissions.split(',').map((p) => p.trim());
    // Sinon refus
    return {
      admin: permList.includes('admin'),
      write: permList.includes('write'),
      read: permList.includes('read'),
    };
  }

  private async getUserAppPermissions(
    applicationId: string,
    email: string,
  ): Promise<APP_PERMS_MAP> {
    const actors = await this.prisma.actor.findMany({
      where: {
        applicationId,
        email,
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
      distinct: ['actorTypeId'],
    });
    // reduce the permissions to a map

    const appPermsMap: APP_PERMS_MAP = {};
    actors.forEach((actor) => {
      if (!actor.actorType) {
        return;
      }
      Object.values(actor.actorType.appPermissions).forEach((actor) => {
        Object.entries(actor).forEach(([key, value]) => {
          if (key === 'actorTypeId') return;
          appPermsMap[key] = appPermsMap[key] || value;
        });
      });
    });

    return appPermsMap;
  }

  private async checkAppPermission(
    user: User,
    applicationId: string,
    action: APP_PERMISSIONS,
  ): Promise<boolean> {
    const globalPerms = this.getUserGlobalPermissions(user);
    if (globalPerms.write || globalPerms.admin) return true;
    if (action.startsWith('read') && globalPerms.read) return true;

    const appPermissions = await this.getUserAppPermissions(
      applicationId,
      user.email,
    );

    return appPermissions[action] ?? false;
  }
}
