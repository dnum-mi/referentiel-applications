import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PrismaService } from '../prisma/prisma.service';
import { ActActor, AppApplication, Role } from '@prisma/client';
import { User } from '../users/entities/user.entity';
import { IS_PUBLIC_KEY } from './allow_anon';

export const SET_A_RESOURCE = 'set_a_resource';

export const Resource = (resource: string) =>
  SetMetadata(SET_A_RESOURCE, resource);

export enum Action {
  Create = 'post',
  Read = 'get',
  Update = 'put',
  Delete = 'delete',
}

@Injectable()
export class PoliciesGuard implements CanActivate {
  private readonly logger = new Logger('PoliciesGuard');

  private actionFunctions = {
    [Action.Create]: 'create',
    [Action.Read]: 'read',
    [Action.Update]: 'update',
    [Action.Delete]: 'delete',
  };

  private roles: Map<string, Role[]>;

  constructor(
    private reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {
    prisma.orgRoletype
      .findMany({ include: { Roles: { include: { resource: true } } } })
      .then((roles) => {
        this.roles = new Map<string, Role[]>();
        roles.forEach((role) => {
          this.roles.set(role.roleid.trim(), role.Roles);
        });
      });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return Promise.resolve(true);
    }

    const resource = this.reflector.get<string>(
      SET_A_RESOURCE,
      context.getClass(),
    );

    const request = await context.switchToHttp().getRequest();
    const user = request.user as User;

    // if (!resource && !user.isAdmin) {
    //   return false;
    // }

    const regexPattern = /\/application(?:s)?\/:(\w+)(?:\/)?/;
    const match = request.route.path.match(regexPattern);
    let application;
    if (match && match[1]) {
      application = await this.prisma.appApplication.findFirst({
        where: { applicationid: request.params[match[1]] },
      });
    }

    return await this.can(
      user,
      resource,
      request.method.toLowerCase() as Action,
      application,
    );
  }

  async can(
    user: User,
    resource: string,
    action: Action,
    application?: AppApplication | null,
  ): Promise<boolean> {
    if (user.isAdmin) {
      if (action === Action.Delete) {
        return false;
      }
      return true;
    }

    if (user.isDirector) {
      if (!user.actor) {
        if (action === Action.Read) {
          return true;
        }
      }
      return await this.isActorCan(user.actor!, resource, action, application);
    }

    if (user.isPublic) {
      if (!user.actor) {
        if (
          action === Action.Read &&
          application?.sensitivity[1] &&
          +application?.sensitivity[1] <= 2
        ) {
          return true;
        }
      }
      return await this.isActorCan(user.actor!, resource, action, application);
    }

    return false;
  }

  async isActorCan(
    actor: ActActor,
    resource: string,
    action: Action,
    application?: AppApplication | null,
  ): Promise<boolean> {
    const appRoles = await this.prisma.prjApplicationrole.findMany({
      where: {
        actorid: actor.actorid,
      },
    });

    for (const role of appRoles) {
      const actorRoles = this.roles.get(role.roleid.trim());
      if (!actorRoles) return false;

      const resourceAbilities = actorRoles?.find(
        (r: any) => r.resource.resource === resource,
      );
      if (!resourceAbilities) return false;

      const actionFunction = this.actionFunctions[action];

      if (role.applicationid === application?.applicationid) {
        if ((resourceAbilities as any)[`${actionFunction}_own`] === true)
          return true;
      } else {
        if ((resourceAbilities as any)[`${actionFunction}_all`] === true)
          return true;
      }
    }

    return false;
  }
}
