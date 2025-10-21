import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Requestor, UserCapabilities } from "src/user/entities/user.entity";
import { USER_CAPABILITY_KEY } from "../decorators/user-capability.decorator";

@Injectable()
export class UserCapabilityGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action = this.reflector.get<string>(
      USER_CAPABILITY_KEY,
      context.getHandler(),
    );

    const request = context.switchToHttp().getRequest();

    const user = request.user as Requestor;

    return user?.capabilities?.includes(action as keyof typeof UserCapabilities) || false;
  }
}
