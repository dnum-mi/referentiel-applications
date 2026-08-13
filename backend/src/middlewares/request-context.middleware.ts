import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { requestContext } from "src/common/request-context";

/**
 * Propage les informations de la requête dans un AsyncLocalStorage (#2226).
 * Branché APRÈS AuthMiddleware, qui pose `req.impersonator` : le reste du
 * traitement (services, extensions Prisma) peut ainsi connaître l'admin réel
 * sans que la valeur soit passée de main en main.
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    requestContext.run({ impersonatorId: req.impersonator?.id }, () => next());
  }
}
