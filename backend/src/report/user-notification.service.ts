import { Injectable } from "@nestjs/common";
import { ReportStatus, Prisma } from "@prisma/client";
import { EmailService } from "src/email/email.service";
import { typeguardIncludes } from "src/utils/typeguard-includes";

@Injectable()
export class UserNotificationService {
  constructor(protected readonly emailService: EmailService) {}

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
      await this.emailService.sendSignalementUpdateEmail({
        recipientEmail: report.notifier.email,
        description: report.description,
        status: report.status,
        applicationName: report.application?.shortName,
        notes: report.notes,
      });
    }
  }
}
