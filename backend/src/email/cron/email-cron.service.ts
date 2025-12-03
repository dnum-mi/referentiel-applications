import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "src/prisma/prisma.service";
import { EmailService } from "../email.service";

interface ApplicationChange {
  applicationId: string
  applicationLabel: string
  changes: {
    action: string
    description: string
    createdAt: Date
  }[]
}

interface UserDigestMap {
  [userId: string]: {
    email: string
    applications: ApplicationChange[]
  }
}

@Injectable()
export class EmailDigestCronService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  @Cron("0 0 * * *", { timeZone: "Europe/Paris" })
  async sendDailyDigest() {
    Logger.log("Starting daily email digest job at midnight");

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const startOfYesterday = new Date(yesterday);
      startOfYesterday.setHours(0, 0, 0, 0);

      const endOfYesterday = new Date(yesterday);
      endOfYesterday.setHours(23, 59, 59, 999);

      Logger.log(`Scanning metadata from ${startOfYesterday.toISOString()} to ${endOfYesterday.toISOString()}`);

      const yesterdayMetadata = await this.prisma.metadata.findMany({
        where: {
          createdAt: {
            gte: startOfYesterday,
            lte: endOfYesterday,
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

      const modifiedAppIds = [...new Set(yesterdayMetadata.map(m => m.applicationId))];
      Logger.log(`Found ${modifiedAppIds.length} modified applications with ${yesterdayMetadata.length} total changes`);

      const applicationsWithSubscribers = await this.prisma.application.findMany({
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
            changes: appMetadata.map(m => ({
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

      const emailTasks = Object.values(userDigestMap).map(digest =>
        this.sendEmailWithRetry(digest.email, digest.applications),
      );

      const results = await Promise.allSettled(emailTasks);

      const successCount = results.filter(r => r.status === "fulfilled").length;
      const failureCount = results.filter(r => r.status === "rejected").length;

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
        await this.emailService.sendDailyDigestNotification(email, applications);
        Logger.log(`Email sent successfully to ${email} on attempt ${attempt}`);
        return;
      } catch (error) {
        lastError = error as Error;
        Logger.warn(`Failed to send email to ${email} on attempt ${attempt}/${maxRetries}`, error);

        if (attempt < maxRetries) {
          const delay = 2 ** (attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    Logger.error(`Failed to send email to ${email} after ${maxRetries} attempts`, lastError);
    throw lastError;
  }
}
