import type { ExecutionContext } from "@nestjs/common";
import { createParamDecorator } from "@nestjs/common";
import type { Request } from "express";
import type { Requestor } from "src/user/entities/user.entity";

export const User = createParamDecorator<
  unknown,
  ExecutionContext,
  Requestor | undefined
>((_data: unknown, ctx: ExecutionContext): Requestor | undefined => {
  const request = ctx.switchToHttp().getRequest<Request>();
  return request.user;
});
