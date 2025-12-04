import type { Transporter } from "nodemailer";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import { EmailTemplateService } from "./email-templates.services";

@Injectable()
export class EmailService {
  private readonly transporter: Transporter;
  private readonly from: string;
  private readonly enabled: boolean;
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly templateService: EmailTemplateService,
  ) {
    const host = this.configService.get<string>("email.host");
    const port = this.configService.get<number>("email.port");
    const secure = this.configService.get<boolean>("email.secure");
    this.from = this.configService.get<string>("email.from", "noreply@example.com");
    this.enabled = this.configService.get<boolean>("email.enabled", true);

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
      this.logger.log(`Actor added notification email sent successfully to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send actor added email to ${to}:`, error as Error);

      this.logger.warn(`Email delivery failed for ${to} but was ignored due to configuration.`);
    }
  }

  async sendActorModifiedNotification(
    to: string,
    actorName: string,
    applicationName?: string,
    changedFields?: string,
  ): Promise<void> {
    if (!this.enabled) {
      this.logger.log(`Email sending disabled. Would have sent modification email to ${to}`);
      return;
    }

    if (!to) {
      this.logger.warn("Cannot send modification email: recipient address is empty");
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
      this.logger.log(`Actor modified notification email sent successfully to ${to}. Changed fields: ${changedFields ? "included" : "not available"}`);
    } catch (error) {
      this.logger.error(`Failed to send actor modified email to ${to}:`, error as Error);
      this.logger.warn(`Email delivery failed for ${to} but was ignored due to configuration.`);
    }
  }
}
