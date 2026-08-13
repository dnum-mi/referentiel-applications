import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { LoggerService } from "src/logger/logger.service";
import { PrismaService } from "src/prisma/prisma.service";
import { Requestor } from "src/user/entities/user.entity";

const MUTATING_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

/**
 * Journal centralisé des actions (#2224) : enregistre chaque requête mutante
 * dans `ActionLog`, avec l'identité effective et, le cas échéant,
 * l'administrateur réel derrière une impersonation (rattachée à sa session).
 *
 * Branché APRÈS AuthMiddleware (qui pose `req.user` / `req.impersonator`).
 * L'écriture se fait sur l'évènement `finish` de la réponse : le code de
 * statut final est connu (y compris les refus 4xx des guards) et la requête
 * n'est jamais ralentie ni mise en échec par la journalisation.
 */
@Injectable()
export class ActionLogMiddleware implements NestMiddleware {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    if (!MUTATING_METHODS.has(req.method)) {
      return next();
    }

    res.on("finish", () => {
      const user = req.user;
      // Pas d'utilisateur résolu (401 d'authentification) : rien à attribuer.
      if (!user) {
        return;
      }
      void this.record(req, res, user, req.impersonator ?? null);
    });

    next();
  }

  private async record(
    req: Request,
    res: Response,
    user: Requestor,
    impersonator: Requestor | null,
  ): Promise<void> {
    try {
      let impersonationLogId: string | null = null;
      if (impersonator) {
        const openSession = await this.prisma.impersonationLog.findFirst({
          where: {
            adminId: impersonator.id,
            targetId: user.id,
            endedAt: null,
          },
          orderBy: { startedAt: "desc" },
          select: { id: true },
        });
        impersonationLogId = openSession?.id ?? null;
      }

      await this.prisma.actionLog.create({
        data: {
          method: req.method,
          path: (req.originalUrl ?? req.url).split("?")[0],
          statusCode: res.statusCode,
          userId: user.id,
          impersonatorId: impersonator?.id ?? null,
          impersonationLogId,
        },
      });
    } catch (error) {
      // La journalisation ne doit jamais faire échouer la requête.
      this.logger.error(
        "[ActionLog] Échec de journalisation d'une action",
        error,
      );
    }
  }
}
