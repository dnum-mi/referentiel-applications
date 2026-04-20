import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LoggerModule } from "src/logger/logger.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { ApplicationValidationCronService } from "./cron/application-validation-cron.service";
import { EmailDigestCronService } from "./cron/email-cron.service";
import { EmailTemplateService } from "./email-templates.services";
import { EmailService } from "./email.service";

@Module({
  imports: [ConfigModule, LoggerModule, PrismaModule],
  providers: [
    EmailService,
    EmailTemplateService,
    EmailDigestCronService,
    ApplicationValidationCronService,
  ],
  exports: [EmailService, EmailTemplateService],
})
export class EmailModule {}
