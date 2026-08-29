import { Injectable, Logger } from "@nestjs/common";
import { NotificationType, ReportStatus, Prisma } from "@prisma/client";
import { EmailService } from "src/email/email.service";
import { NotificationService } from "src/notification/notification.service";
import { typeguardIncludes } from "src/utils/typeguard-includes";

@Injectable()
export class UserNotificationService {
  constructor(
    protected readonly emailService: EmailService,
    protected readonly notificationService: NotificationService,
  ) {}

  async notifyUserOnStatusChange(
    shouldNotify: boolean,
    report: Prisma.ReportGetPayload<{
      include: { notifier: true; application: true };
    }>,
  ) {
    const { status } = report;
    const needNotify =
      shouldNotify &&
      typeguardIncludes(status, [ReportStatus.done, ReportStatus.in_progress]);
    if (needNotify) {
      // #2377 : l'email est un COMPLÉMENT à la notification in-app. Son échec (SMTP indisponible)
      // ne doit ni faire échouer la mise à jour du statut du signalement (500 à l'admin), ni
      // empêcher la notification in-app — seul canal qui prévient réellement le déclarant. On
      // isole donc l'envoi et on crée la notification quel que soit son sort.
      let emailLogId: string | undefined;
      try {
        const emailLog = await this.emailService.sendSignalementUpdateEmail({
          recipientEmail: report.notifier.email,
          description: report.description,
          status: report.status,
          applicationName: report.application?.shortName,
          notes: report.notes,
        });
        emailLogId = emailLog?.id;
      } catch (error) {
        Logger.error(
          `Échec de l'email de mise à jour du signalement ${report.id} : notification in-app conservée`,
          error instanceof Error ? error.stack : String(error),
        );
      }

      const statusLabel =
        status === ReportStatus.done ? "traité" : "pris en compte";
      await this.notificationService.create(
        report.notifier.id,
        NotificationType.report_status_changed,
        `Votre signalement${report.application ? ` sur ${report.application.shortName ?? report.application.label}` : ""} a été ${statusLabel}.`,
        {
          link: "/signalements",
          applicationId: report.applicationId ?? undefined,
          emailLogId,
        },
      );
    }
  }

  async notifyManagersOnReportCreated(
    report: Prisma.ReportGetPayload<{
      include: { application: true; notifier: true };
    }>,
  ) {
    const managerIds = (
      await this.notificationService.findUsersWithReportManagePermission(
        report.applicationId ?? undefined,
      )
    ).filter((id) => id !== report.notifierId);
    await this.notificationService.createForUsers(
      managerIds,
      NotificationType.report_created,
      `Nouveau signalement${report.application ? ` sur ${report.application.shortName ?? report.application.label}` : ""}.`,
      {
        link: "/signalements",
        applicationId: report.applicationId ?? undefined,
      },
    );
  }
}
