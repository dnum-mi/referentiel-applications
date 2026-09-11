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
import { JWTPayload, createRemoteJWKSet, decodeJwt, jwtVerify } from "jose";
import {
  AuthLevelEvaluation,
  evaluateAuthLevel,
  isDowngraded,
  stepDownPrincipal,
} from "src/auth-level/auth-level";
import { stepDownBody } from "src/auth-level/step-down.exception";
import { UserinfoClaimsResolver } from "src/auth-level/userinfo-claims";
import { authLevelConfig, oidcConfig } from "src/config/configs";
import { principalToPermissions } from "src/permissions/role-to-permissions";
import { TokenService } from "src/token/token.service";
import { Requestor, UserEntity, UserType } from "src/user/entities/user.entity";
import { ScopePermissionsException } from "src/user/errors/scope-permissions.exception";
import { ScopedPermissionService } from "src/user/scope-permission/scoped-permission.service";
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
  /** #1985 : repli userinfo quand le claim de mode manque sur l'access token. */
  private readonly userinfo?: UserinfoClaimsResolver;

  constructor(
    @Inject(oidcConfig.KEY)
    private readonly oidc: ConfigType<typeof oidcConfig>,
    private readonly userService: UserService,
    private readonly scopedPermissionService: ScopedPermissionService,
    private readonly tokenService: TokenService,
    private readonly userConnexionLogService: UserConnexionLogService,
    private readonly logger: LoggerService,
    private readonly maintenanceService: MaintenanceService,
    @Inject(authLevelConfig.KEY)
    private readonly authLevel: ConfigType<typeof authLevelConfig>,
  ) {
    this.jwks = createRemoteJWKSet(new URL(this.oidc.jwksUrl));
    const { mode, claim, idpClaim, userinfo } = this.authLevel;
    if (mode !== "off" && claim && userinfo.enabled) {
      this.userinfo = new UserinfoClaimsResolver({
        url: userinfo.url,
        discoveryUrl: this.oidc.configUrl,
        claimNames: idpClaim ? [claim, idpClaim] : [claim],
        clientId: this.oidc.clientId,
        timeoutMs: userinfo.timeoutMs,
        verifyJwt: async (jwt) =>
          process.env.DISABLE_JWT_VALIDATION
            ? decodeJwt(jwt)
            : (await jwtVerify(jwt, this.jwks)).payload,
        onError: (message) => this.logger.warn(message),
      });
    }
  }

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const maintenanceMode =
        req.maintenanceMode ?? (await this.maintenanceService.isActive());
      const authorization = req.headers.authorization?.split(" ")[1];
      const token = req.headers[API_KEY_HEADER] as string | undefined;

      // #2372 : on retient la MÉTHODE d'authentification réellement employée
      // (`!token`), et non la simple présence du header `Authorization`. Un
      // porteur de token API pouvait sinon ajouter un `Authorization` bidon
      // (jamais décodé, car la branche token gagne l'authentification) pour
      // satisfaire la condition d'impersonation malgré l'interdiction.
      const authenticatedByJwt = !token && !!authorization;

      let user: UserEntity | null = null;
      // Niveau d'authentification de la session (#1985), évalué sur la seule
      // branche JWT : un jeton API est une authentification machine, sans
      // contexte de connexion — il n'est jamais rétrogradé.
      let evaluation: AuthLevelEvaluation | undefined;

      if (token) {
        user = await this.tokenService.findUserByToken(token, {
          readOnly: maintenanceMode,
        });
      } else if (authorization) {
        const payload = process.env.DISABLE_JWT_VALIDATION
          ? decodeJwt(authorization)
          : (await jwtVerify(authorization, this.jwks)).payload;
        evaluation = await this.evaluateLevel(authorization, payload);
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

      // #1985 : en mode `enforce`, une session sans authentification forte (carte
      // agent ou double authentification) ne porte que les droits d'un utilisateur
      // standard. La réécriture est faite EN MÉMOIRE, avant `principalToPermissions`,
      // avant l'impersonation et avant le journal : tout ce qui suit lit ce
      // principal, jamais la ligne en base.
      const downgraded =
        evaluation !== undefined && isDowngraded(evaluation, this.authLevel);
      const principal = downgraded ? stepDownPrincipal(user) : user;

      // L'utilisateur réellement authentifié (avant toute impersonation).
      const authenticatedUser: Requestor = {
        ...principal,
        permissions: principalToPermissions(principal),
        authLevel:
          evaluation && this.authLevel.mode !== "off"
            ? { level: evaluation.level, downgraded, reason: evaluation.reason }
            : undefined,
      };
      req.user = authenticatedUser;

      // Impersonation : un administrateur peut se faire passer pour un autre
      // utilisateur en fournissant son identifiant via un header dédié. Seule
      // l'authentification humaine (JWT) y donne droit, pas les tokens API.
      const impersonateUserId = req.headers[IMPERSONATE_HEADER] as
        | string
        | undefined;
      if (impersonateUserId && authenticatedByJwt) {
        if (downgraded) {
          // Refus explicite plutôt que le refus générique « pas administrateur » :
          // le front rejoue le header depuis le localStorage à chaque requête et
          // doit reconnaître le payload `stepDown` pour purger l'impersonation. La
          // tentative n'atteint pas ActionLogMiddleware (réponse avant `next()`) :
          // ce warn est la seule trace.
          this.logger.warn(
            `[AuthLevel] Impersonation refusée en session faible : ${user.email} → ${impersonateUserId} (${evaluation?.reason})`,
          );
          if (!maintenanceMode) {
            await this.userService.stopImpersonation(
              user.id,
              impersonateUserId,
            );
          }
          res.status(403);
          res.json(stepDownBody("impersonation"));
          return;
        }
        req.user = await this.resolveImpersonatedUser(
          authenticatedUser,
          impersonateUserId,
        );
        req.impersonator = authenticatedUser;
      }

      // On journalise toujours la connexion de l'utilisateur réellement
      // authentifié, jamais celle de la cible impersonnée.
      if (!maintenanceMode) {
        const logged = await this.userConnexionLogService.log(
          authenticatedUser.id,
          evaluation,
        );
        if (logged?.created) {
          this.logFirstConnexionOfTheDay(user, evaluation, downgraded);
        }
      }

      next();
    } catch (error) {
      this.logger.error(error);

      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException ||
        error instanceof ScopePermissionsException
      ) {
        throw error;
      }

      throw new UnauthorizedException("L'authentification a échoué");
    }
  }

  /**
   * Évalue le niveau d'authentification sur l'access token, puis, si le claim de mode y manque et
   * que le repli est activé, sur les claims lus à l'endpoint userinfo avec ce même jeton (#1985).
   * Les claims userinfo ne comblent que ce qui manque : ils ne peuvent qu'ajouter une preuve.
   */
  private async evaluateLevel(
    accessToken: string,
    payload: JWTPayload,
  ): Promise<AuthLevelEvaluation> {
    const evaluation = evaluateAuthLevel(payload, this.authLevel);
    if (
      !this.userinfo ||
      (evaluation.reason !== "claim-missing" &&
        evaluation.reason !== "untrusted-idp")
    ) {
      return evaluation;
    }
    const claims = await this.userinfo.resolve(accessToken, payload);
    // Les claims userinfo ne comblent que ce qui manque sur le jeton signé : une valeur
    // présente sur le jeton (ex. le fournisseur d'origine) n'est jamais remplacée.
    const merged: JWTPayload = { ...payload };
    let filled = false;
    for (const [name, value] of Object.entries(claims)) {
      if (merged[name] === undefined) {
        merged[name] = value;
        filled = true;
      }
    }
    if (!filled) return evaluation;
    return { ...evaluateAuthLevel(merged, this.authLevel), source: "userinfo" };
  }

  /**
   * Une ligne de log applicatif par utilisateur, par jour et par niveau (jamais par
   * requête) : en `observe`, c'est le canal de mesure qui dit ce que le fournisseur
   * d'identité transmet réellement ; en `enforce`, seule une rétrogradation qui retire
   * effectivement quelque chose mérite un avertissement.
   */
  private logFirstConnexionOfTheDay(
    user: UserEntity,
    evaluation: AuthLevelEvaluation | undefined,
    downgraded: boolean,
  ) {
    if (!evaluation || this.authLevel.mode === "off") return;
    const details = `user=${user.email} level=${evaluation.level} reason=${evaluation.reason} method=${evaluation.claimValue ?? "-"} idp=${evaluation.idp ?? "-"} source=${evaluation.source ?? "jeton"} role=${user.role}`;
    if (this.authLevel.mode === "observe") {
      this.logger.log(`[AuthLevel] ${details}`);
      return;
    }
    const losesSomething =
      user.role !== Roles.VISITOR ||
      (user.additionalPermissions?.length ?? 0) > 0 ||
      !!user.scopeOrganizationId;
    if (downgraded && losesSomething) {
      this.logger.warn(`[AuthLevel] Session rétrogradée : ${details}`);
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

    // Contrôle de périmètre ICI et pas seulement dans startImpersonation :
    // c'est ce middleware qui applique l'identité à chaque requête, et le
    // header peut être posé sans jamais passer par l'endpoint dédié (#2217).
    await this.scopedPermissionService.assertCanImpersonate(
      targetUserId,
      admin,
    );

    return {
      ...target,
      permissions: principalToPermissions(target),
    };
  }
}
