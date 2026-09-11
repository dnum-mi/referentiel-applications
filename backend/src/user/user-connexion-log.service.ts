import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { AuthLevel, User, UserConnexionLog } from "@prisma/client";
import type { AuthLevelEvaluation } from "src/auth-level/auth-level";
import { BaseService } from "src/common/base.service";
import { PrismaService } from "src/prisma/prisma.service";
import { UserConnexionLogDto } from "./dto/user-connexion-log.dto";

/** Dernières connexions renvoyées à l'administration : assez pour diagnostiquer, sans pagination. */
export const CONNEXION_LOG_HISTORY_LIMIT = 30;

@Injectable()
export class UserConnexionLogService extends BaseService<UserConnexionLog> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma.userConnexionLog, prisma);
  }

  /**
   * Une ligne par utilisateur, jour et contexte (niveau, mode, fournisseur, source).
   * Deux modes encore classés faibles restent distinguables pendant l'observation.
   * L'empreinte borne la taille de l'index, même pour des claims longs. `skipDuplicates`
   * dédoublonne aussi les requêtes concurrentes et déclenche un seul log par contexte.
   */
  public async log(
    userId: User["id"],
    evaluation?: AuthLevelEvaluation,
  ): Promise<{ created: boolean }> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const authMethod = evaluation?.claimValue ?? null;
    const authIdp = evaluation?.idp ?? null;
    const authSource =
      evaluation && evaluation.reason !== "disabled"
        ? (evaluation.source ?? "token")
        : null;
    const authContextKey = createHash("sha256")
      .update(JSON.stringify([authMethod, authIdp, authSource]))
      .digest("hex");
    const { count } = await this.prisma.userConnexionLog.createMany({
      data: [
        {
          userId,
          authTime: today,
          authLevel: evaluation?.level ?? AuthLevel.unknown,
          authMethod,
          authIdp,
          authSource,
          authContextKey,
        },
      ],
      skipDuplicates: true,
    });
    return { created: count === 1 };
  }

  /** Dernières connexions d'un utilisateur (#1985), du jour le plus récent au plus ancien. */
  public async findAllForUser(
    userId: User["id"],
    limit = CONNEXION_LOG_HISTORY_LIMIT,
  ): Promise<UserConnexionLogDto[]> {
    const logs = await this.prisma.userConnexionLog.findMany({
      where: { userId },
      orderBy: [{ authTime: "desc" }, { createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        authTime: true,
        authLevel: true,
        authMethod: true,
        authIdp: true,
        authSource: true,
      },
    });
    return logs;
  }
}
