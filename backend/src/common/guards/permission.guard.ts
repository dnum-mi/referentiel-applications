import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Permission } from "@prisma/client";
import { Requestor } from "src/user/entities/user.entity";
import { REQUIRED_PERMISSIONS } from "../decorators/required-permissions.decorator";
import { CheckPermissions } from "../service/check-permissions.service";

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly checkPermissions: CheckPermissions,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.get<Permission[]>(
      REQUIRED_PERMISSIONS,
      context.getHandler(),
    );
    if (!required?.length) return true;
    const request = context
      .switchToHttp()
      .getRequest<{ user?: Requestor; params?: { applicationId?: string } }>();
    const user = request.user;
    if (!user) {
      return false;
    }
    const applicationId = request?.params?.applicationId;
    return this.checkPermissions.can(required, user, applicationId);
  }
}
