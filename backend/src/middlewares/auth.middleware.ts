import {
  Inject,
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, decodeJwt, jwtVerify } from "jose";
import { ActionLogService } from "src/action-log/action-log.service";
import { oidcConfig } from "src/config/configs";
import { roleToPermissions } from "src/permissions/role-to-permissions";
import { TokenService } from "src/token/token.service";
import { Requestor, UserEntity } from "src/user/entities/user.entity";
import { UserService } from "src/user/user.service";
import { API_KEY_HEADER } from "src/utils/constants.util";

declare module "express" {
  export interface Request {
    user?: Requestor | null;
  }
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(
    @Inject(oidcConfig.KEY)
    private readonly oidc: ConfigType<typeof oidcConfig>,
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
    private readonly actionLogService: ActionLogService,
  ) {
    this.jwks = createRemoteJWKSet(new URL(this.oidc.jwksUrl));
  }

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const authorization = req.headers.authorization?.split(" ")[1];
      const token = req.headers[API_KEY_HEADER] as string | undefined;

      let user: UserEntity | null = null;

      if (token) {
        user = await this.tokenService.findUserByToken(token);
      } else if (authorization) {
        const payload = process.env.DISABLE_JWT_VALIDATION
          ? decodeJwt(authorization)
          : (await jwtVerify(authorization, this.jwks)).payload;
        user = await this.userService.findOrCreateByEmail(
          payload.email as string,
        );
      }

      if (!user) {
        res.status(401);
        res.json({ message: "L'authentification a échoué" });
        return;
      }
      req.user = {
        ...user,
        permissions: roleToPermissions(user.adminLevel),
      };

      this.actionLogService.updateUserLastLogin(req.user);

      next();
    } catch (error) {
      console.error(error);
      throw new UnauthorizedException("L'authentification a échoué");
    }
  }
}
