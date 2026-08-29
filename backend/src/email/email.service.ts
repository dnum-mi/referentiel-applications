import { Injectable } from "@nestjs/common";
import { LoggerService } from "src/logger/logger.service";
import { ConfigService } from "@nestjs/config";
import type { Transporter } from "nodemailer";
import * as nodemailer from "nodemailer";
import type { EmailLog } from "@prisma/client";
import { EmailLogService } from "./email-log.service";
import { EmailTemplateService } from "./email-templates.services";
import { MailSendException } from "./error/mail-send.exception";
import { ReportStatus } from "@prisma/client";
import { ReportStatusLabels } from "src/applications/constants/enum-label";
import { escapeHtml } from "src/utils/escape-html.util";

@Injectable()
export class EmailService {
  private readonly transporter: Transporter;
  private readonly from: string;
  private readonly enabled: boolean;
  private readonly appUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly templateService: EmailTemplateService,
    private readonly emailLogService: EmailLogService,
    private readonly logger: LoggerService,
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
      "BASE_URL",
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

  /**
   * Envoie l'e-mail puis historise l'envoi effectif (#2209). Ne journalise pas les envois en
   * échec. Renvoie le `EmailLog` créé : les appelants s'en servent pour lier la notification
   * in-app correspondante à cet e-mail (#2280 — suite), afin d'en afficher le contenu au clic
   * plutôt que de rediriger.
   */
  private async deliver({
    to,
    subject,
    text,
    html,
  }: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<EmailLog> {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject,
      text,
      html,
    });
    return this.emailLogService.log({ to, subject, html, text });
  }

  async sendActorAddedNotification(
    to: string,
    actorName: string,
    applicationName?: string,
  ): Promise<EmailLog | null> {
    if (!this.enabled) {
      this.logger.log(`Email sending disabled. Would have sent to ${to}`);
      return null;
    }

    if (!to) {
      this.logger.warn("Cannot send email: recipient address is empty");
      return null;
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
      const emailLog = await this.deliver({ to, subject, text, html });
      this.logger.log(
        `Actor added notification email sent successfully to ${to}`,
      );
      return emailLog;
    } catch (error) {
      this.logger.error(`Failed to send actor added email to ${to}:`, error);

      this.logger.warn(
        `Email delivery failed for ${to} but was ignored due to configuration.`,
      );
      return null;
    }
  }

  async sendActorModifiedNotification(
    to: string,
    actorName: string,
    applicationName?: string,
    changedFields?: string,
  ): Promise<EmailLog | null> {
    if (!this.enabled) {
      this.logger.log(
        `Email sending disabled. Would have sent modification email to ${to}`,
      );
      return null;
    }

    if (!to) {
      this.logger.warn(
        "Cannot send modification email: recipient address is empty",
      );
      return null;
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
      const emailLog = await this.deliver({ to, subject, text, html });
      this.logger.log(
        `Actor modified notification email sent successfully to ${to}. Changed fields: ${changedFields ? "included" : "not available"}`,
      );
      return emailLog;
    } catch (error) {
      this.logger.error(`Failed to send actor modified email to ${to}:`, error);
      this.logger.warn(
        `Email delivery failed for ${to} but was ignored due to configuration.`,
      );
      return null;
    }
  }

  private getActionLabel(action: string): string {
    if (action === "add") {
      return "Ajout";
    }
    if (action === "update") {
      return "Modification";
    }
    return "Suppression";
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
            const actionLabel = this.getActionLabel(change.action);
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
      await this.deliver({ to: recipient, subject, text, html });
      this.logger.log(
        `Daily digest email sent successfully to ${recipient} (${totalChanges} changes)`,
      );
    } catch (error) {
      this.logger.error(`Failed to send daily digest to ${recipient}:`, error);
      throw error;
    }
  }

  async sendApplicationValidationReminderEmail({
    recipientEmail,
    applicationId,
    applicationLabel,
    lastModifiedDate,
  }: {
    recipientEmail: string;
    applicationId: string;
    applicationLabel: string;
    lastModifiedDate: Date;
  }): Promise<EmailLog | null> {
    if (!this.enabled) {
      this.logger.log(
        `Email sending disabled. Would have sent validation reminder to ${recipientEmail}`,
      );
      return null;
    }

    if (!recipientEmail) {
      this.logger.warn(
        "Cannot send validation reminder: recipient address is empty",
      );
      return null;
    }

    const subject = `Rappel : veuillez vérifier la fiche de l'application "${applicationLabel}"`;

    const html = this.templateService.render(
      "application-validation-reminder",
      {
        title: subject,
        headerTitle: "Référentiel des Applications",
        applicationLabel,
        lastModifiedDate: lastModifiedDate.toLocaleDateString("fr-FR"),
        applicationUrl: `${this.appUrl}/applications/${applicationId}`,
      },
    );

    const text = this.templateService.htmlToText(html);

    try {
      const emailLog = await this.deliver({
        to: recipientEmail,
        subject,
        text,
        html,
      });
      this.logger.log(
        `Application validation reminder sent successfully to ${recipientEmail} for application ${applicationId}`,
      );
      return emailLog;
    } catch (error) {
      this.logger.error(
        `Failed to send validation reminder to ${recipientEmail}:`,
        error,
      );
      throw error;
    }
  }

  async sendUserOrganizationChangedNotification({
    to,
    userEmail,
    oldOrganization,
    newOrganization,
  }: {
    to: string;
    userEmail: string;
    oldOrganization: string | null;
    newOrganization: string | null;
  }): Promise<EmailLog | null> {
    if (!this.enabled) {
      this.logger.log(
        `Email sending disabled. Would have sent organization change notification to ${to}`,
      );
      return null;
    }

    if (!to) {
      this.logger.warn(
        "Cannot send organization change notification: recipient address is empty",
      );
      return null;
    }

    const subject = "Votre organisation a été modifiée";

    const html = this.templateService.render("user-organization-changed", {
      title: subject,
      headerTitle: "Référentiel des Applications",
      userEmail,
      oldOrganization: oldOrganization ?? "Aucune",
      newOrganization: newOrganization ?? "Aucune",
    });

    const text = this.templateService.htmlToText(html);

    try {
      const emailLog = await this.deliver({ to, subject, text, html });
      this.logger.log(
        `Organization change notification sent successfully to ${to}`,
      );
      return emailLog;
    } catch (error) {
      this.logger.error(
        `Failed to send organization change notification to ${to}:`,
        error,
      );
      this.logger.warn(
        `Email delivery failed for ${to} but was ignored due to configuration.`,
      );
      return null;
    }
  }

  async sendUserPermissionsChangedNotification({
    to,
    userEmail,
    role,
    additionalPermissions,
    changedByEmail,
  }: {
    to: string;
    userEmail: string;
    role: string;
    additionalPermissions: string[];
    changedByEmail: string | null;
  }): Promise<EmailLog | null> {
    if (!this.enabled) {
      this.logger.log(
        `Email sending disabled. Would have sent permissions change notification to ${to}`,
      );
      return null;
    }

    if (!to) {
      this.logger.warn(
        "Cannot send permissions change notification: recipient address is empty",
      );
      return null;
    }

    const subject = "Vos droits ont été modifiés";

    const html = this.templateService.render("user-permissions-changed", {
      title: subject,
      headerTitle: "Référentiel des Applications",
      userEmail,
      role,
      additionalPermissions: additionalPermissions.length
        ? additionalPermissions.join(", ")
        : "Aucune",
      changedByEmail: changedByEmail ?? "un administrateur",
      changeDate: new Date().toLocaleString("fr-FR"),
    });

    const text = this.templateService.htmlToText(html);

    try {
      const emailLog = await this.deliver({ to, subject, text, html });
      this.logger.log(
        `Permissions change notification sent successfully to ${to}`,
      );
      return emailLog;
    } catch (error) {
      this.logger.error(
        `Failed to send permissions change notification to ${to}:`,
        error,
      );
      this.logger.warn(
        `Email delivery failed for ${to} but was ignored due to configuration.`,
      );
      return null;
    }
  }

  async sendUserBlockedNotification({
    to,
    userEmail,
    changedByEmail,
  }: {
    to: string;
    userEmail: string;
    changedByEmail: string | null;
  }): Promise<EmailLog | null> {
    if (!this.enabled) {
      this.logger.log(
        `Email sending disabled. Would have sent block notification to ${to}`,
      );
      return null;
    }

    if (!to) {
      this.logger.warn(
        "Cannot send block notification: recipient address is empty",
      );
      return null;
    }

    const subject = "Votre accès a été bloqué";

    const html = this.templateService.render("user-blocked", {
      title: subject,
      headerTitle: "Référentiel des Applications",
      userEmail,
      changedByEmail: changedByEmail ?? "un administrateur",
      changeDate: new Date().toLocaleString("fr-FR"),
    });

    const text = this.templateService.htmlToText(html);

    try {
      const emailLog = await this.deliver({ to, subject, text, html });
      this.logger.log(`Block notification sent successfully to ${to}`);
      return emailLog;
    } catch (error) {
      this.logger.error(`Failed to send block notification to ${to}:`, error);
      this.logger.warn(
        `Email delivery failed for ${to} but was ignored due to configuration.`,
      );
      return null;
    }
  }

  async sendUserUnblockedNotification({
    to,
    userEmail,
    changedByEmail,
  }: {
    to: string;
    userEmail: string;
    changedByEmail: string | null;
  }): Promise<EmailLog | null> {
    if (!this.enabled) {
      this.logger.log(
        `Email sending disabled. Would have sent unblock notification to ${to}`,
      );
      return null;
    }

    if (!to) {
      this.logger.warn(
        "Cannot send unblock notification: recipient address is empty",
      );
      return null;
    }

    const subject = "Votre accès a été rétabli";

    const html = this.templateService.render("user-unblocked", {
      title: subject,
      headerTitle: "Référentiel des Applications",
      userEmail,
      changedByEmail: changedByEmail ?? "un administrateur",
      changeDate: new Date().toLocaleString("fr-FR"),
    });

    const text = this.templateService.htmlToText(html);

    try {
      const emailLog = await this.deliver({ to, subject, text, html });
      this.logger.log(`Unblock notification sent successfully to ${to}`);
      return emailLog;
    } catch (error) {
      this.logger.error(`Failed to send unblock notification to ${to}:`, error);
      this.logger.warn(
        `Email delivery failed for ${to} but was ignored due to configuration.`,
      );
      return null;
    }
  }

  async sendQualityCampaignReminderEmail({
    recipientEmail,
    applicationId,
    applicationLabel,
    currentIq,
    campaignName,
    message,
  }: {
    recipientEmail: string;
    applicationId: string;
    applicationLabel: string;
    currentIq: number | null;
    campaignName: string;
    message: string | null;
  }): Promise<EmailLog | null> {
    if (!this.enabled) {
      this.logger.log(
        `Email sending disabled. Would have sent quality campaign reminder to ${recipientEmail}`,
      );
      return null;
    }

    if (!recipientEmail) {
      this.logger.warn(
        "Cannot send quality campaign reminder: recipient address is empty",
      );
      return null;
    }

    const subject = `Campagne qualité « ${campaignName} » : améliorez l'IQ de "${applicationLabel}"`;

    // #2380 : le message vient d'un utilisateur (QualityCampaignManage, délégable à des non-admins).
    // Non échappé, il permettait d'injecter du HTML arbitraire dans l'email (phishing sous
    // l'identité officielle).
    const messageBlock = message
      ? `<tr><td style="padding-bottom: 20px"><p style="margin: 0; font-size: 16px; color: #161616; line-height: 1.5">${escapeHtml(message)}</p></td></tr>`
      : "";

    const html = this.templateService.render(
      "quality-campaign-actor-reminder",
      {
        title: subject,
        headerTitle: "Référentiel des Applications",
        applicationLabel,
        campaignName,
        currentIq: currentIq != null ? currentIq.toString() : "non calculé",
        messageBlock,
        applicationUrl: `${this.appUrl}/applications/${applicationId}`,
      },
    );

    const text = this.templateService.htmlToText(html);

    try {
      const emailLog = await this.deliver({
        to: recipientEmail,
        subject,
        text,
        html,
      });
      this.logger.log(
        `Quality campaign reminder sent successfully to ${recipientEmail} for application ${applicationId}`,
      );
      return emailLog;
    } catch (error) {
      this.logger.error(
        `Failed to send quality campaign reminder to ${recipientEmail}:`,
        error,
      );
      this.logger.warn(
        `Email delivery failed for ${recipientEmail} but was ignored due to configuration.`,
      );
      return null;
    }
  }

  async sendQualityCampaignSponsorReportEmail({
    recipientEmails,
    campaignName,
    targets,
    averageIqAtStart,
    averageIqCurrent,
    averageDelta,
  }: {
    recipientEmails: string[];
    campaignName: string;
    targets: Array<{
      applicationId: string;
      applicationLabel: string;
      iqAtStart: number | null;
      iqCurrent: number | null;
    }>;
    averageIqAtStart: number | null;
    averageIqCurrent: number | null;
    averageDelta: number | null;
  }): Promise<EmailLog | null> {
    // Un seul e-mail avec tous les sponsors en destinataires (le champ `to` d'EmailLog supporte
    // déjà une liste — cf. sa description "Destinataire(s)"), plutôt qu'un envoi par sponsor.
    const recipientEmail = recipientEmails.join(", ");

    if (!this.enabled) {
      this.logger.log(
        `Email sending disabled. Would have sent quality campaign sponsor report to ${recipientEmail}`,
      );
      return null;
    }

    if (recipientEmails.length === 0) {
      this.logger.warn(
        "Cannot send quality campaign sponsor report: no recipient address",
      );
      return null;
    }

    const subject = `Résultats de la campagne qualité « ${campaignName} »`;

    const formatIq = (iq: number | null) => (iq != null ? iq.toString() : "—");
    const formatAverage = (iq: number | null) =>
      iq != null ? iq.toFixed(1) : "—";
    const formatDelta = (delta: number | null) =>
      delta != null ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)}` : "—";
    // Delta en points d'IQ, pas en pourcentage relatif : l'IQ étant déjà une échelle 0-100, un
    // delta relatif explose de façon trompeuse pour les applications ciblées par la campagne —
    // justement celles parties d'un IQ bas (ex. 5 → 50 donnerait "+900%" pour un gain réel de 45
    // points).
    const formatProgress = (
      iqAtStart: number | null,
      iqCurrent: number | null,
    ) => {
      if (iqAtStart == null || iqCurrent == null) return "—";
      const progress = iqCurrent - iqAtStart;
      return `${progress > 0 ? "+" : ""}${progress} pts`;
    };

    const targetsRows = targets
      .map(
        (target) => `
          <tr>
            <td style="border-bottom: 1px solid #eeeeee">${target.applicationLabel}</td>
            <td style="border-bottom: 1px solid #eeeeee">${formatIq(target.iqAtStart)}</td>
            <td style="border-bottom: 1px solid #eeeeee">${formatIq(target.iqCurrent)}</td>
            <td style="border-bottom: 1px solid #eeeeee">${formatProgress(target.iqAtStart, target.iqCurrent)}</td>
          </tr>`,
      )
      .join("");

    const html = this.templateService.render(
      "quality-campaign-sponsor-report",
      {
        title: subject,
        headerTitle: "Référentiel des Applications",
        campaignName,
        targetCount: targets.length.toString(),
        averageIqAtStart: formatAverage(averageIqAtStart),
        averageIqCurrent: formatAverage(averageIqCurrent),
        averageDelta: formatDelta(averageDelta),
        targetsRows,
      },
    );

    const text = this.templateService.htmlToText(html);

    try {
      const emailLog = await this.deliver({
        to: recipientEmail,
        subject,
        text,
        html,
      });
      this.logger.log(
        `Quality campaign sponsor report sent successfully to ${recipientEmail}`,
      );
      return emailLog;
    } catch (error) {
      this.logger.error(
        `Failed to send quality campaign sponsor report to ${recipientEmail}:`,
        error,
      );
      this.logger.warn(
        `Email delivery failed for ${recipientEmail} but was ignored due to configuration.`,
      );
      return null;
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
    status: ReportStatus;
    applicationName?: string;
    notes: string;
  }): Promise<EmailLog> {
    const subject = "Anomalie notification update";
    const html = this.templateService.render("report-status-update", {
      title: subject,
      headerTitle: "Référentiel des Applications",
      applicationName: applicationName || "Signalement global",
      description,
      status: ReportStatusLabels[status],
      notes,
    });

    const text = this.templateService.htmlToText(html);

    try {
      return await this.deliver({ to: recipientEmail, subject, text, html });
    } catch (error) {
      this.logger.error(
        `Failed to send report status update email to ${recipientEmail}:`,
        error,
      );
      throw new MailSendException(
        `Failed to send report status update email to ${recipientEmail}:`,
      );
    }
  }
}
