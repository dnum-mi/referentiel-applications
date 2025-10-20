import {
  Inject,
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { Request, Response, NextFunction } from "express";
import { createRemoteJWKSet, decodeJwt, jwtVerify } from "jose";
import { ActionLogService } from "src/action-log/action-log.service";
import { keycloakConfig } from "src/config/configs";
import { TokenService } from "src/token/token.service";
import { AdminLevel, Requestor, UserCapabilities, UserEntity } from "src/user/entities/user.entity";
import { UserService } from "src/user/user.service";
import { API_KEY_HEADER } from "src/utils/constants.util";

declare module "express" {
  export interface Request {
    user?: Requestor | null
  }
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(
    @Inject(keycloakConfig.KEY)
    private readonly keycloak: ConfigType<typeof keycloakConfig>,
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
    private readonly actionLogService: ActionLogService,
  ) {
    this.jwks = createRemoteJWKSet(new URL(this.keycloak.jwksUrl));
  }

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const authorization = req.headers.authorization?.split(" ")[1];
      const token = req.headers[API_KEY_HEADER] as string | undefined;

      let user: UserEntity | null = null;

      if (token) {
        user = await this.tokenService.findUserByToken(token);
      } else if (authorization) {
        const payload = process.env.AUTH_VERIFY_JWT
          ? (await jwtVerify(authorization, this.jwks)).payload
          : decodeJwt(authorization);
        user = await this.userService.findOrCreateByEmail(
          payload.email as string,
          payload.sub as string,
        );
      }

      if (!user) {
        res.status(401);
        res.json({ message: "L'authentification a échoué" });
        return;
      }
      const capabilities = user.capabilities ?? [];
      if (user.adminLevel >= AdminLevel.WRITE) {
        capabilities.push(...Object.keys(UserCapabilities) as (keyof typeof UserCapabilities)[]);
      }
      req.user = { ...user, capabilities };

      this.actionLogService.updateUserLastLogin(req.user);

      next();
    } catch (error) {
      console.error(error);
      throw new UnauthorizedException("L'authentification a échoué");
    }
  }
}
