import { Injectable } from "@nestjs/common";
import { AnomalyNotificationStatus, Prisma } from "@prisma/client";
import { EmailService } from "src/email/email.service";
import { typeguardIncludes } from "src/utils/typeguard-includes";

@Injectable()
export class UserNotificationService {
  constructor(protected readonly emailService: EmailService) {}

  async notifyUserOnStatusChange(
    shouldNotify: boolean,
    anomalyNotification: Prisma.AnomalyNotificationGetPayload<{
      include: { notifier: true; application: true };
    }>,
  ) {
    const { status } = anomalyNotification;
    const needNotify =
      shouldNotify &&
      typeguardIncludes(status, [
        AnomalyNotificationStatus.done,
        AnomalyNotificationStatus.in_progress,
      ]);
    if (needNotify) {
      await this.emailService.sendSignalementUpdateEmail({
        recipientEmail: anomalyNotification.notifier.email,
        description: anomalyNotification.description,
        status: anomalyNotification.status,
        applicationName: anomalyNotification.application?.shortName,
      });
    }
  }
}
