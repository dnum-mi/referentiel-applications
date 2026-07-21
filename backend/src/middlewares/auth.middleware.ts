import {
  ForbiddenException,
  Inject,
  Injectable,
  NestMiddleware,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { Roles } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, decodeJwt, jwtVerify } from "jose";
import { oidcConfig } from "src/config/configs";
import { FeatureFlagKey } from "src/feature-flag/feature-flag.keys";
import { FeatureFlagService } from "src/feature-flag/feature-flag.service";
import { roleToPermissions } from "src/permissions/role-to-permissions";
import { TokenService } from "src/token/token.service";
import { Requestor, UserEntity, UserType } from "src/user/entities/user.entity";
import { UserConnexionLogService } from "src/user/user-connexion-log.service";
import { UserService } from "src/user/user.service";
import { API_KEY_HEADER, IMPERSONATE_HEADER } from "src/utils/constants.util";
import { LoggerService } from "src/logger/logger.service";

declare module "express" {
  export interface Request {
    user?: Requestor | null;
    /// Administrateur réel lorsqu'une impersonation est en cours.
    impersonator?: Requestor | null;
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
    private readonly userConnexionLogService: UserConnexionLogService,
    private readonly featureFlagService: FeatureFlagService,
    private readonly logger: LoggerService,
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

      // L'utilisateur réellement authentifié (avant toute impersonation).
      const authenticatedUser: Requestor = {
        ...user,
        permissions: roleToPermissions(user.role),
      };
      req.user = authenticatedUser;

      // Impersonation : un administrateur peut se faire passer pour un autre
      // utilisateur en fournissant son identifiant via un header dédié. Seule
      // l'authentification humaine (JWT) y donne droit, pas les tokens API.
      const impersonateUserId = req.headers[IMPERSONATE_HEADER] as
        | string
        | undefined;
      if (impersonateUserId && authorization) {
        // Kill-switch : l'impersonation est refusée (et non silencieusement
        // ignorée, ce qui ferait agir l'admin sous sa propre identité à son
        // insu) quand le feature flag est désactivé.
        if (
          !(await this.featureFlagService.isEnabled(
            FeatureFlagKey.IMPERSONATION,
          ))
        ) {
          throw new ForbiddenException("L'impersonation est désactivée.");
        }
        req.user = await this.resolveImpersonatedUser(
          authenticatedUser,
          impersonateUserId,
        );
        req.impersonator = authenticatedUser;
      }

      // On journalise toujours la connexion de l'utilisateur réellement
      // authentifié, jamais celle de la cible impersonnée.
      await this.userConnexionLogService.log(authenticatedUser.id);

      next();
    } catch (error) {
      this.logger.error(error);

      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new UnauthorizedException("L'authentification a échoué");
    }
  }

  private async resolveImpersonatedUser(
    admin: Requestor,
    targetUserId: string,
  ): Promise<Requestor> {
    if (admin.role !== Roles.ADMIN) {
      throw new ForbiddenException(
        "Seuls les administrateurs peuvent impersonner un utilisateur",
      );
    }

    const target = await this.userService.findByIdWithRelations(targetUserId);
    if (!target || target.type === UserType.bot) {
      throw new NotFoundException("Utilisateur à impersonner introuvable");
    }

    return {
      ...target,
      permissions: roleToPermissions(target.role),
    };
  }
}
