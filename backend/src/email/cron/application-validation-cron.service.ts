import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { Status } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { EmailService } from "../email.service";

const NOTIFICATION_TYPE = "application_validation_reminder";
const ACTOR_TYPE_CODES = ["MOA", "MOE", "ProductOwner", "ProductManager"];

function subtractMonths(baseDate: Date, monthsAmount: number): Date {
  const resultDate = new Date(baseDate);
  resultDate.setMonth(resultDate.getMonth() - monthsAmount);
  return resultDate;
}

@Injectable()
export class ApplicationValidationCronService
  implements OnApplicationBootstrap
{
  private readonly logger = new Logger(ApplicationValidationCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log(
      "Bootstrap : Vérification initiale des applications à relancer...",
    );
    await this.sendValidationReminders();
  }

  @Cron("30 9 1 * *", { timeZone: "Europe/Paris" })
  async handleMonthlyCron() {
    this.logger.log("Exécution mensuelle programmée du rappel de validation.");
    await this.sendValidationReminders();
  }

  async sendValidationReminders() {
    const currentDateTime = new Date();
    const sixMonthsThresholdDate = subtractMonths(currentDateTime, 6);
    const oneMonthAntiSpamDate = subtractMonths(currentDateTime, 1);

    this.logger.log(
      `[START] Job de relance validation. Seuil : ${sixMonthsThresholdDate.toISOString()}`,
    );

    try {
      const totalApplicationsCount = await this.prisma.application.count();
      this.logger.log(
        `Diagnostic - Apps totales en base : ${totalApplicationsCount}`,
      );

      const staleApplications = await this.prisma.application.findMany({
        where: {
          OR: [
            { currentStatusId: null },
            {
              currentStatus: {
                status: { notIn: [Status.decommissioned, Status.deleted] },
              },
            },
          ],
          metadatas: {
            none: {
              createdAt: { gte: sixMonthsThresholdDate },
            },
          },
        },
        select: {
          id: true,
          label: true,
          metadatas: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true },
          },
          actors: {
            where: {
              actorType: {
                code: { in: ACTOR_TYPE_CODES },
              },
            },
            select: {
              email: true,
            },
          },
          notificationLogs: {
            where: {
              type: NOTIFICATION_TYPE,
              sentAt: { gte: oneMonthAntiSpamDate },
            },
            select: { id: true },
            take: 1,
          },
        },
      });

      this.logger.log(
        `Applications identifiées comme obsolètes : ${staleApplications.length}`,
      );

      let notifiedApplicationsCount = 0;
      let skippedApplicationsCount = 0;

      for (const application of staleApplications) {
        if (application.notificationLogs.length > 0) {
          this.logger.debug(
            `App [${application.label}] sautée : déjà relancée récemment.`,
          );
          skippedApplicationsCount++;
          continue;
        }

        const recipientEmailsList = [
          ...new Set(
            application.actors
              .map((actor) => actor.email)
              .filter((emailAddress): emailAddress is string =>
                Boolean(emailAddress),
              ),
          ),
        ];

        if (recipientEmailsList.length === 0) {
          this.logger.warn(
            `App [${application.label}] : aucun email responsable trouvé.`,
          );
          continue;
        }

        const lastModifiedDate = application.metadatas[0]?.createdAt
          ? new Date(application.metadatas[0].createdAt)
          : sixMonthsThresholdDate;

        const eligibleEmailsList =
          await this.getEmailsWithNotificationsEnabled(recipientEmailsList);

        if (eligibleEmailsList.length === 0) {
          this.logger.debug(
            `App [${application.label}] : alertes désactivées par les utilisateurs.`,
          );
          continue;
        }

        for (const emailAddress of eligibleEmailsList) {
          try {
            await this.emailService.sendApplicationValidationReminderEmail({
              recipientEmail: emailAddress,
              applicationId: application.id,
              applicationLabel: application.label,
              lastModifiedDate,
            });
            this.logger.log(
              `Email envoyé à ${emailAddress} pour [${application.label}]`,
            );
          } catch (error) {
            this.logger.error(
              `Erreur mail (${emailAddress}) sur ${application.id}:`,
              error,
            );
          }
        }

        await this.prisma.notificationLog.create({
          data: {
            applicationId: application.id,
            type: NOTIFICATION_TYPE,
          },
        });

        notifiedApplicationsCount++;
      }

      this.logger.log(
        `[FIN] Job terminé. Notifiées: ${notifiedApplicationsCount}, Déjà faites: ${skippedApplicationsCount}`,
      );
    } catch (error) {
      this.logger.error("Erreur critique durant le job de validation:", error);
    }
  }

  private async getEmailsWithNotificationsEnabled(
    emailsList: string[],
  ): Promise<string[]> {
    const disabledUsersList = await this.prisma.user.findMany({
      where: {
        email: { in: emailsList },
        emailNotificationsEnabled: false,
      },
      select: { email: true },
    });

    const disabledEmailsSet = new Set(
      disabledUsersList.map((user) => user.email),
    );
    return emailsList.filter(
      (emailAddress) => !disabledEmailsSet.has(emailAddress),
    );
  }
}
