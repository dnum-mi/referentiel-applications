import type { ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import type { Requestor } from "src/user/entities/user.entity";
import { createParamDecorator } from "@nestjs/common";

/// Récupère l'administrateur réel lorsqu'une impersonation est en cours.
/// Retourne `undefined` en l'absence d'impersonation.
export const Impersonator = createParamDecorator<
  unknown,
  ExecutionContext,
  Requestor | undefined
>((_data: unknown, ctx: ExecutionContext): Requestor | undefined => {
  const request = ctx.switchToHttp().getRequest<Request>();
  return request.impersonator ?? undefined;
});
