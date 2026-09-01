import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { NotificationType } from "@prisma/client";
import { RETIRED_STATUSES } from "src/applications/constants/status-groups";
import { LoggerService } from "src/logger/logger.service";
import { NotificationService } from "src/notification/notification.service";
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
  private readonly cronEnabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {
    this.cronEnabled = this.configService.get<boolean>(
      "email.cronEnabled",
      false,
    );
  }

  async onApplicationBootstrap() {
    if (!this.cronEnabled) {
      this.logger.log(
        "Relances de validation désactivées (EMAIL_CRON_ENABLED) : vérification au démarrage ignorée.",
      );
      return;
    }
    this.logger.log(
      "Bootstrap : Vérification initiale des applications à relancer...",
    );
    await this.sendValidationReminders();
  }

  @Cron("30 9 1 * *", { timeZone: "Europe/Paris" })
  async handleMonthlyCron() {
    if (!this.cronEnabled) {
      this.logger.log(
        "Relances de validation désactivées (EMAIL_CRON_ENABLED) : exécution mensuelle ignorée.",
      );
      return;
    }
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
                status: { notIn: [...RETIRED_STATUSES] },
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

        // #2381 : la casse des emails d'acteurs peut différer de celle des comptes.
        // Déduplication insensible à la casse (garde la 1re casse rencontrée).
        const recipientEmailsList = [
          ...new Map(
            application.actors
              .map((actor) => actor.email)
              .filter((emailAddress): emailAddress is string =>
                Boolean(emailAddress),
              )
              .map(
                (emailAddress) =>
                  [emailAddress.toLowerCase(), emailAddress] as const,
              ),
          ).values(),
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

        // Notification in-app : complément persistant, indépendant de l'opt-out email. Résolue
        // en amont pour lier chaque notification à l'e-mail effectivement envoyé au même
        // utilisateur (#2280 — suite), quand un tel e-mail existe.
        // `in` est sensible à la casse en base : on croise via des `equals` insensibles.
        const recipientUsers = await this.prisma.user.findMany({
          where: {
            OR: recipientEmailsList.map((emailAddress) => ({
              email: { equals: emailAddress, mode: "insensitive" as const },
            })),
          },
          select: { id: true, email: true, emailNotificationsEnabled: true },
        });

        const optedOutEmails = new Set(
          recipientUsers
            .filter((user) => user.emailNotificationsEnabled === false)
            .map((user) => user.email.toLowerCase()),
        );
        const eligibleEmailsList = recipientEmailsList.filter(
          (emailAddress) => !optedOutEmails.has(emailAddress.toLowerCase()),
        );

        const emailLogIdByEmail = new Map<string, string>();
        if (eligibleEmailsList.length === 0) {
          this.logger.debug(
            `App [${application.label}] : alertes désactivées par les utilisateurs.`,
          );
        } else {
          for (const emailAddress of eligibleEmailsList) {
            try {
              const emailLog =
                await this.emailService.sendApplicationValidationReminderEmail({
                  recipientEmail: emailAddress,
                  applicationId: application.id,
                  applicationLabel: application.label,
                  lastModifiedDate,
                });
              if (emailLog) {
                emailLogIdByEmail.set(emailAddress.toLowerCase(), emailLog.id);
              }
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
        }

        // #2378 : ne considérer l'application « relancée » ce cycle (et poser l'anti-spam) que si
        // un canal a effectivement abouti.
        // - Des emails étaient à envoyer : traité seulement si au moins un a réussi. Si tous ont
        //   échoué (SMTP en panne), on retente au prochain passage plutôt que de sauter l'app un
        //   ou deux mois.
        // - Aucun email à envoyer (tous opt-out) : traité dès qu'il y a des destinataires in-app,
        //   afin de poser l'anti-spam et d'éviter de recréer les mêmes notifications à chaque
        //   redémarrage.
        const emailAttempted = eligibleEmailsList.length > 0;
        const anyEmailSent = emailLogIdByEmail.size > 0;
        const applicationNotified = emailAttempted
          ? anyEmailSent
          : recipientUsers.length > 0;

        if (!applicationNotified) {
          // Rien n'a abouti : on n'écrit ni notification in-app ni anti-spam pour tout renvoyer
          // ensemble au prochain passage (évite un doublon in-app quand l'email repartira).
          continue;
        }

        // Notifications in-app : complément persistant, créé une seule fois grâce à l'anti-spam
        // ci-dessous.
        await Promise.all(
          recipientUsers.map((user) =>
            this.notificationService.create(
              user.id,
              NotificationType.application_validation_reminder,
              `La fiche de l'application ${application.label} n'a pas été mise à jour depuis plus de 6 mois.`,
              {
                link: `/applications/${application.id}`,
                applicationId: application.id,
                emailLogId: emailLogIdByEmail.get(user.email.toLowerCase()),
              },
            ),
          ),
        );

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
}
