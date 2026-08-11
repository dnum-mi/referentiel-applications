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
import { roleToPermissions } from "src/permissions/role-to-permissions";
import { TokenService } from "src/token/token.service";
import { Requestor, UserEntity, UserType } from "src/user/entities/user.entity";
import { UserConnexionLogService } from "src/user/user-connexion-log.service";
import { UserService } from "src/user/user.service";
import { API_KEY_HEADER, IMPERSONATE_HEADER } from "src/utils/constants.util";
import { LoggerService } from "src/logger/logger.service";
import { MaintenanceService } from "src/maintenance/maintenance.service";

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
    private readonly logger: LoggerService,
    private readonly maintenanceService: MaintenanceService,
  ) {
    this.jwks = createRemoteJWKSet(new URL(this.oidc.jwksUrl));
  }

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const maintenanceMode =
        req.maintenanceMode ?? (await this.maintenanceService.isActive());
      const authorization = req.headers.authorization?.split(" ")[1];
      const token = req.headers[API_KEY_HEADER] as string | undefined;

      let user: UserEntity | null = null;

      if (token) {
        user = await this.tokenService.findUserByToken(token, {
          readOnly: maintenanceMode,
        });
      } else if (authorization) {
        const payload = process.env.DISABLE_JWT_VALIDATION
          ? decodeJwt(authorization)
          : (await jwtVerify(authorization, this.jwks)).payload;
        const email = payload.email as string;
        user = maintenanceMode
          ? await this.userService.findByEmailWithRelations(email)
          : await this.userService.findOrCreateByEmail(email);
      }

      if (!user) {
        res.status(401);
        res.json({ message: "L'authentification a échoué" });
        return;
      }

      if (user.isBlocked) {
        // 403 (et non 401) : la session SSO est valide, mais l'accès a été explicitement
        // bloqué par un administrateur. Un 401 déclencherait une boucle de ré-authentification
        // côté front (cf. init-clients.ts), inutile puisque Keycloak laisserait passer à nouveau.
        res.status(403);
        res.json({
          statusCode: 403,
          blocked: true,
          message: "Votre accès a été bloqué. Contactez un administrateur.",
        });
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
        req.user = await this.resolveImpersonatedUser(
          authenticatedUser,
          impersonateUserId,
        );
        req.impersonator = authenticatedUser;
      }

      // On journalise toujours la connexion de l'utilisateur réellement
      // authentifié, jamais celle de la cible impersonnée.
      if (!maintenanceMode) {
        await this.userConnexionLogService.log(authenticatedUser.id);
      }

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
    if (target.isBlocked) {
      throw new ForbiddenException(
        "Impossible d'impersonner un utilisateur bloqué",
      );
    }

    return {
      ...target,
      permissions: roleToPermissions(target.role),
    };
  }
}
