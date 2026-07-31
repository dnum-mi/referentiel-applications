import type { ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import type { Requestor } from "src/user/entities/user.entity";
import { createParamDecorator } from "@nestjs/common";

export const User = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Requestor | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user;
  },
);
