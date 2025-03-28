import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const { user } = request;

    // Determine default permissions based on HTTP method
    const method = request.method;
    const defaultRole = this.getDefaultRoleForMethod(method);

    // Combine explicitly required roles with the default role
    const rolesToCheck = requiredRoles || [defaultRole];

    if (!rolesToCheck.includes(user?.permissions)) {
      throw new ForbiddenException('Access denied: Insufficient permissions');
    }

    return true;
  }

  private getDefaultRoleForMethod(method: string): string {
    switch (method) {
      case 'POST':
      case 'PATCH':
      case 'PUT':
      case 'DELETE':
        return 'write'; // Write permissions for modifying methods
      case 'GET':
      default:
        return 'read'; // Read permissions for GET and other methods
    }
  }
}
