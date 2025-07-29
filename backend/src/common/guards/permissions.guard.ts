import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const {
      user,
      // method
    } = request;

    if (!user || user.permissions == null) {
      throw new ForbiddenException('User permissions not found');
    }

    // If specific permissions are required, check them
    if (requiredPermissions && requiredPermissions.length > 0) {
      if (!this.hasPermission(user.permissions, requiredPermissions)) {
        throw new ForbiddenException('Insufficient permissions');
      }
      return true;
    }

    return true;
  }

  private hasPermission(
    userPermissions: string,
    requiredPermissions: string[],
  ): boolean {
    const permissions = userPermissions.split(',');

    return requiredPermissions.every((permission) =>
      permissions.includes(permission),
    );
  }
}
