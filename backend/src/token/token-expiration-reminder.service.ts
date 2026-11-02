import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "src/prisma/prisma.service";

const NOTICE_MS = 7 * 24 * 60 * 60 * 1000;
const expirationFormat = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

@Injectable()
export class TokenExpirationReminderService {
  private readonly logger = new Logger(TokenExpirationReminderService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron(): Promise<void> {
    try {
      await this.notifyExpiringTokens();
    } catch {
      this.logger.error(
        "Échec du traitement des rappels d'expiration des jetons",
      );
    }
  }

  async notifyExpiringTokens(): Promise<void> {
    const now = new Date();
    const candidates = await this.prisma.token.findMany({
      where: {
        status: "active",
        expiresAt: { gt: now, lte: new Date(now.getTime() + NOTICE_MS) },
        createdBy: { type: "human", isBlocked: false },
      },
      select: { id: true, createdById: true },
    });

    for (const candidate of candidates) {
      try {
        await this.prisma.$transaction(async (tx) => {
          // Verrouiller le créateur avant le jeton, comme un blocage de compte.
          await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${candidate.createdById} FOR UPDATE`;
          await tx.$queryRaw`SELECT "id" FROM "Token" WHERE "id" = ${candidate.id} FOR UPDATE`;
          const checkedAt = new Date();
          const token = await tx.token.findFirst({
            where: {
              id: candidate.id,
              createdById: candidate.createdById,
              status: "active",
              expiresAt: {
                gt: checkedAt,
                lte: new Date(checkedAt.getTime() + NOTICE_MS),
              },
              createdBy: { type: "human", isBlocked: false },
            },
            select: {
              id: true,
              name: true,
              expiresAt: true,
              createdById: true,
            },
          });
          if (!token) return;
          const { count } = await tx.tokenExpirationReminder.createMany({
            data: { tokenId: token.id, expiresAt: token.expiresAt },
            skipDuplicates: true,
          });
          if (!count) return;
          await tx.notification.create({
            data: {
              userId: token.createdById,
              type: "token_expiration_reminder",
              message: `Le jeton « ${token.name} » expire le ${expirationFormat.format(token.expiresAt)}.`,
              link: "/profil?tab=tokens",
            },
          });
        });
      } catch {
        this.logger.error(
          `Échec du rappel d'expiration du jeton ${candidate.id} ; nouvelle tentative au prochain passage`,
        );
      }
    }
  }
}
