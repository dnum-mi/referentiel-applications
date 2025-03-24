import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { UserService } from 'src/user/user.service';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private jwks = createRemoteJWKSet(new URL(process.env.KEYCLOAK_JWKS_URL));

  constructor(private userService: UserService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.headers['authorization'].split(' ')[1];
      const { payload } = await jwtVerify(token, this.jwks);

      req.user = await this.userService.findOrCreateByEmail(
        payload.email as string,
        payload.sub as string,
      );

      next();
    } catch (error) {
      console.error(error);
      throw new UnauthorizedException("L'authentification a échoué");
    }
  }
}
