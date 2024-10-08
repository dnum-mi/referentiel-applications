import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './allow_anon';
import { User } from '../users/entities/user.entity';
import { PrismaService } from '../prisma/prisma.service';
import { EnvironmentVariablesService } from '../environment-variables/environment-variables.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    private env: EnvironmentVariablesService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return Promise.resolve(true);
    }

    //TODO: TO be removed!
    const request = context.switchToHttp().getRequest();
    const bearerToken = request.headers['authorization'];

    if (bearerToken) {
      const token = bearerToken.substring(7);

      const isDSO = token === this.env.DSOToken;
      const isCDP = token === this.env.CDPToken;

      if (isDSO || isCDP) {
        request.user = new User();
        request.user.username = isDSO ? 'Administrateur' : 'CDP';
        request.user.groups = isDSO ? ['Administrator'] : ['Direction'];
        request.user.actor = !isDSO
          ? await this.prisma.actActor.findFirst({
              where: { email: this.env.Email },
            })
          : null;
        return true;
      }
    }
    /////////////////////////////////////////////////

    return (await super.canActivate(context)) as boolean;
  }
}
