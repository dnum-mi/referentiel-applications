import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AdminLevel } from "src/user/entities/user.entity";
import { ADMIN_LEVEL_KEY } from "../decorators/admin.decorator";

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredAdminLevel = this.reflector.getAllAndOverride<AdminLevel>(
      ADMIN_LEVEL_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const {
      user,
      // method
    } = request;

    if (!user) {
      throw new ForbiddenException("User not found");
    }

    // If specific admin level is required, check it
    if (requiredAdminLevel) {
      if (user.adminLevel < requiredAdminLevel) {
        throw new ForbiddenException("Insufficient admin level");
      }
      return true;
    }

    return true;
  }
}
