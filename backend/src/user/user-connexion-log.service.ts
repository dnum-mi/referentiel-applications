import { Injectable } from "@nestjs/common";
import { AuthLevel, User, UserConnexionLog } from "@prisma/client";
import type { AuthLevelEvaluation } from "src/auth-level/auth-level";
import { BaseService } from "src/common/base.service";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class UserConnexionLogService extends BaseService<UserConnexionLog> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma.userConnexionLog, prisma);
  }

  /**
   * Une ligne par utilisateur, par jour ET par niveau d'authentification (#1985) : un agent
   * passé de faible à fort dans la journée laisse deux lignes, rien n'est perdu. `createMany`
   * avec `skipDuplicates` = un seul aller-retour sans lecture préalable, et `created` signale
   * gratuitement la première connexion du jour à ce niveau (déclencheur de l'unique ligne de
   * log applicatif). Les valeurs brutes du claim et du fournisseur sont conservées : c'est ce
   * qui rend la phase d'observation utile.
   */
  public async log(
    userId: User["id"],
    evaluation?: AuthLevelEvaluation,
  ): Promise<{ created: boolean }> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const { count } = await this.prisma.userConnexionLog.createMany({
      data: [
        {
          userId,
          authTime: today,
          authLevel: evaluation?.level ?? AuthLevel.unknown,
          authMethod: evaluation?.claimValue ?? null,
          authIdp: evaluation?.idp ?? null,
        },
      ],
      skipDuplicates: true,
    });
    return { created: count === 1 };
  }
}
