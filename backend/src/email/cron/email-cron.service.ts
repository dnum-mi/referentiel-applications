import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "src/prisma/prisma.service";
import { EmailService } from "../email.service";

const parisDateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const parisTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Paris",
  hourCycle: "h23",
  hour: "2-digit",
  minute: "2-digit",
});

function parisMidnight(year: number, month: number, day: number): Date {
  const utcMidnight = Date.UTC(year, month - 1, day);
  // À minuit UTC, Paris a encore le décalage de son minuit civil, même les jours de changement d'heure.
  const parts = parisTimeFormatter.formatToParts(new Date(utcMidnight));
  const hour = Number(parts.find((part) => part.type === "hour")!.value);
  const minute = Number(parts.find((part) => part.type === "minute")!.value);
  return new Date(utcMidnight - (hour * 60 + minute) * 60_000);
}

interface ApplicationChange {
  applicationId: string;
  applicationLabel: string;
  changes: {
    action: string;
    description: string;
    createdAt: Date;
  }[];
}

interface UserDigestMap {
  [userId: string]: {
    email: string;
    applications: ApplicationChange[];
  };
}

@Injectable()
export class EmailDigestCronService {
  private readonly cronEnabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {
    this.cronEnabled = this.configService.get<boolean>(
      "email.cronEnabled",
      false,
    );
  }

  @Cron("0 0 * * *", { timeZone: "Europe/Paris" })
  async handleDailyCron() {
    if (!this.cronEnabled) {
      Logger.log(
        "Digest quotidien désactivé (EMAIL_CRON_ENABLED) : exécution nocturne ignorée.",
      );
      return;
    }
    await this.sendDailyDigest();
  }

  // targetDate cible le jour de cet instant à Paris ; sans date, la veille civile à Paris.
  async sendDailyDigest(targetDate?: Date) {
    Logger.log("Starting daily email digest job at midnight");

    try {
      const parts = parisDateFormatter.formatToParts(targetDate ?? new Date());
      const year = Number(parts.find((part) => part.type === "year")!.value);
      const month = Number(parts.find((part) => part.type === "month")!.value);
      const day =
        Number(parts.find((part) => part.type === "day")!.value) -
        (targetDate === undefined ? 1 : 0);
      const start = parisMidnight(year, month, day);
      const end = parisMidnight(year, month, day + 1);

      Logger.log(
        `Scanning metadata from ${start.toISOString()} to ${end.toISOString()} (exclusive)`,
      );

      const yesterdayMetadata = await this.prisma.metadata.findMany({
        where: {
          action: { not: "export" },
          createdAt: {
            gte: start,
            lt: end,
          },
        },
        select: {
          id: true,
          applicationId: true,
          action: true,
          description: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      if (yesterdayMetadata.length === 0) {
        Logger.log("No metadata changes yesterday, skipping digest");
        return;
      }

      // Certaines métadonnées (ex. signalements globaux) n'ont pas d'applicationId :
      // on les exclut, sinon `id: { in: [null, …] }` fait échouer la requête Prisma.
      const modifiedAppIds = [
        ...new Set(
          yesterdayMetadata
            .map((m) => m.applicationId)
            .filter((id): id is string => Boolean(id)),
        ),
      ];
      Logger.log(
        `Found ${modifiedAppIds.length} modified applications with ${yesterdayMetadata.length} total changes`,
      );

      const applicationsWithSubscribers =
        await this.prisma.application.findMany({
          where: {
            id: {
              in: modifiedAppIds,
            },
          },
          select: {
            id: true,
            label: true,
            subscribers: {
              where: {
                emailNotificationsEnabled: true,
              },
              select: {
                id: true,
                email: true,
              },
            },
          },
        });

      const userDigestMap: UserDigestMap = {};

      const metadataByApp = new Map<string, typeof yesterdayMetadata>();
      for (const metadata of yesterdayMetadata) {
        if (!metadataByApp.has(metadata.applicationId)) {
          metadataByApp.set(metadata.applicationId, []);
        }
        metadataByApp.get(metadata.applicationId)!.push(metadata);
      }

      for (const app of applicationsWithSubscribers) {
        const appMetadata = metadataByApp.get(app.id) || [];

        for (const subscriber of app.subscribers) {
          if (!userDigestMap[subscriber.id]) {
            userDigestMap[subscriber.id] = {
              email: subscriber.email,
              applications: [],
            };
          }

          userDigestMap[subscriber.id].applications.push({
            applicationId: app.id,
            applicationLabel: app.label,
            changes: appMetadata.map((m) => ({
              action: m.action,
              description: m.description || "",
              createdAt: m.createdAt,
            })),
          });
        }
      }

      const userCount = Object.keys(userDigestMap).length;
      Logger.log(`Prepared digests for ${userCount} users`);

      if (userCount === 0) {
        Logger.log("No subscribers to notify, skipping email sending");
        return;
      }

      const emailTasks = Object.values(userDigestMap).map((digest) =>
        this.sendEmailWithRetry(digest.email, digest.applications),
      );

      const results = await Promise.allSettled(emailTasks);

      const successCount = results.filter(
        (r) => r.status === "fulfilled",
      ).length;
      const failureCount = results.filter(
        (r) => r.status === "rejected",
      ).length;

      Logger.log(
        `Daily digest completed: ${successCount} emails sent successfully, ${failureCount} failed, ${yesterdayMetadata.length} changes processed`,
      );
    } catch (error) {
      Logger.error("Error during daily digest job", error);
    }
  }

  private async sendEmailWithRetry(
    email: string,
    applications: ApplicationChange[],
    maxRetries: number = 3,
  ): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.emailService.sendDailyDigestNotification(
          email,
          applications,
        );
        Logger.log(`Email sent successfully to ${email} on attempt ${attempt}`);
        return;
      } catch (error) {
        lastError = error as Error;
        Logger.warn(
          `Failed to send email to ${email} on attempt ${attempt}/${maxRetries}`,
          error,
        );

        if (attempt < maxRetries) {
          const delay = 2 ** (attempt - 1) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    Logger.error(
      `Failed to send email to ${email} after ${maxRetries} attempts`,
      lastError,
    );
    throw lastError;
  }
}
