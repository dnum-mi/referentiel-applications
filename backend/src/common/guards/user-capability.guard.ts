import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  AdminLevel,
  Requestor,
  UserCapabilities,
} from "src/user/entities/user.entity";
import { USER_CAPABILITY_KEY } from "../decorators/user-capability.decorator";

@Injectable()
export class UserCapabilityGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action = this.reflector.get<string>(
      USER_CAPABILITY_KEY,
      context.getHandler(),
    );

    const request = context.switchToHttp().getRequest();

    const user = request.user as Requestor;
    if (!user) {
      return false;
    }

    if (user.adminLevel >= AdminLevel.ADMIN) {
      return true;
    }

    return (
      user?.capabilities?.includes(action as keyof typeof UserCapabilities) ||
      false
    );
  }
}
