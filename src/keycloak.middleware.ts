import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { keycloak } from './keycloak-config';

@Injectable()
export class KeycloakMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    keycloak.protect()(req, res, next); // Utilisez protect() pour appliquer la protection Keycloak
  }
}
