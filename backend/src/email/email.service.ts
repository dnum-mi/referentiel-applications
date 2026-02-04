import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Transporter } from "nodemailer";
import * as nodemailer from "nodemailer";
import { EmailTemplateService } from "./email-templates.services";
import { MailSendException } from "./error/mail-send.exception";
import { AnomalyNotificationStatus } from "@prisma/client";
import { AnomalyNotificationStatusLabels } from "src/applications/constants/enum-label";

@Injectable()
export class EmailService {
  private readonly transporter: Transporter;
  private readonly from: string;
  private readonly enabled: boolean;
  private readonly logger = new Logger(EmailService.name);
  private readonly appUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly templateService: EmailTemplateService,
  ) {
    const host = this.configService.get<string>("email.host");
    const port = this.configService.get<number>("email.port");
    const secure = this.configService.get<boolean>("email.secure");
    this.from = this.configService.get<string>(
      "email.from",
      "noreply@example.com",
    );
    this.enabled = this.configService.get<boolean>("email.enabled", true);
    this.appUrl = this.configService.get<string>(
      "APP_URL",
      "http://localhost:5173",
    );

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      tls: {
        rejectUnauthorized: false,
      },
    });

    this.logger.log(`Email service initialized (enabled: ${this.enabled})`);
  }

  async sendActorAddedNotification(
    to: string,
    actorName: string,
    applicationName?: string,
  ): Promise<void> {
    if (!this.enabled) {
      this.logger.log(`Email sending disabled. Would have sent to ${to}`);
      return;
    }

    if (!to) {
      this.logger.warn("Cannot send email: recipient address is empty");
      return;
    }

    const subject = "Vous avez été ajouté à une application";

    const html = this.templateService.render("actor-added", {
      title: subject,
      headerTitle: "Référentiel des Applications",
      actorName,
      applicationName: applicationName || "une application",
    });

    const text = this.templateService.htmlToText(html);

    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        text,
        html,
      });
      this.logger.log(
        `Actor added notification email sent successfully to ${to}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send actor added email to ${to}:`,
        error as Error,
      );

      this.logger.warn(
        `Email delivery failed for ${to} but was ignored due to configuration.`,
      );
    }
  }

  async sendActorModifiedNotification(
    to: string,
    actorName: string,
    applicationName?: string,
    changedFields?: string,
  ): Promise<void> {
    if (!this.enabled) {
      this.logger.log(
        `Email sending disabled. Would have sent modification email to ${to}`,
      );
      return;
    }

    if (!to) {
      this.logger.warn(
        "Cannot send modification email: recipient address is empty",
      );
      return;
    }

    const subject = "Vos informations d'acteur ont été modifiées";

    const html = this.templateService.render("actor-modified", {
      title: subject,
      headerTitle: "Référentiel des Applications",
      actorName,
      applicationName: applicationName || "une application",
      changedFields: changedFields || "",
    });

    const text = this.templateService.htmlToText(html);

    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        text,
        html,
      });
      this.logger.log(
        `Actor modified notification email sent successfully to ${to}. Changed fields: ${changedFields ? "included" : "not available"}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send actor modified email to ${to}:`,
        error as Error,
      );
      this.logger.warn(
        `Email delivery failed for ${to} but was ignored due to configuration.`,
      );
    }
  }

  async sendDailyDigestNotification(
    recipient: string,
    applications: Array<{
      applicationId: string;
      applicationLabel: string;
      changes: Array<{
        action: string;
        description: string;
        createdAt: Date;
      }>;
    }>,
  ): Promise<void> {
    if (!this.enabled) {
      this.logger.log(
        `Email sending disabled. Would have sent daily digest to ${recipient}`,
      );
      return;
    }

    if (!recipient) {
      this.logger.warn("Cannot send daily digest: recipient address is empty");
      return;
    }

    if (!applications.length) {
      this.logger.log(`No changes for ${recipient}, skipping digest`);
      return;
    }

    const totalChanges = applications.reduce(
      (sum, app) => sum + app.changes.length,
      0,
    );
    const date = new Date().toLocaleDateString("fr-FR");
    const subject = `Résumé quotidien : ${totalChanges} modification${totalChanges > 1 ? "s" : ""} sur ${applications.length} application${applications.length > 1 ? "s" : ""}`;

    // Build applications summary HTML
    const applicationsSummary = applications
      .map((app) => {
        const changesHtml = app.changes
          .map((change) => {
            const time = new Date(change.createdAt).toLocaleTimeString(
              "fr-FR",
              {
                hour: "2-digit",
                minute: "2-digit",
              },
            );
            const actionLabel =
              change.action === "add"
                ? "Ajout"
                : change.action === "update"
                  ? "Modification"
                  : "Suppression";
            return `<li style="margin-bottom: 8px;"><strong>${time}</strong> - ${actionLabel}: ${change.description}</li>`;
          })
          .join("");

        return `
          <div style="margin-bottom: 20px; padding: 15px; background-color: #f6f6f6; border-left: 4px solid #000091; border-radius: 4px;">
            <h3 style="margin: 0 0 10px 0; color: #000091; font-size: 16px;">
              ${app.applicationLabel} (${app.changes.length} modification${app.changes.length > 1 ? "s" : ""})
            </h3>
            <a href="${this.appUrl}/applications/${app.applicationId}" style="color: #000091; text-decoration: underline; font-size: 14px;">Voir l'application</a>
            <ul style="margin: 10px 0 0 0; padding-left: 20px; font-size: 14px; color: #161616;">
              ${changesHtml}
            </ul>
          </div>
        `;
      })
      .join("");

    const html = this.templateService.render("daily-digest", {
      title: subject,
      headerTitle: "Référentiel des Applications",
      date,
      totalChanges: totalChanges.toString(),
      applicationsCount: applications.length.toString(),
      applicationsSummary,
    });

    const text = this.templateService.htmlToText(html);

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: recipient,
        subject,
        text,
        html,
      });
      this.logger.log(
        `Daily digest email sent successfully to ${recipient} (${totalChanges} changes)`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send daily digest to ${recipient}:`,
        error as Error,
      );
      throw error;
    }
  }

  async sendSignalementUpdateEmail({
    recipientEmail,
    description,
    status,
    applicationName,
    notes,
  }: {
    recipientEmail: string;
    description: string;
    status: AnomalyNotificationStatus;
    applicationName?: string;
    notes: string;
  }) {
    const subject = "Anomalie notification update";
    const html = this.templateService.render("anomaly-notification-notify", {
      title: subject,
      headerTitle: "Référentiel des Applications",
      applicationName: applicationName || "Signalement global",
      description,
      status: AnomalyNotificationStatusLabels[status],
      notes,
    });

    const text = this.templateService.htmlToText(html);

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: recipientEmail,
        subject,
        text,
        html,
      });
    } catch (error) {
      throw new MailSendException(
        `Failed to send  anomaly update email to ${recipientEmail}:`,
      );
    }
  }
}
