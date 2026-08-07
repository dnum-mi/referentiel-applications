import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CommonModule } from "src/common/common.module";
import { LoggerModule } from "src/logger/logger.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { ApplicationValidationCronService } from "./cron/application-validation-cron.service";
import { EmailDigestCronService } from "./cron/email-cron.service";
import { EmailLogService } from "./email-log.service";
import { EmailTemplateService } from "./email-templates.services";
import { EmailService } from "./email.service";
import { EmailController } from "./email.controller";

@Module({
  imports: [ConfigModule, LoggerModule, PrismaModule, CommonModule],
  controllers: [EmailController],
  providers: [
    EmailService,
    EmailTemplateService,
    EmailLogService,
    EmailDigestCronService,
    ApplicationValidationCronService,
  ],
  exports: [EmailService, EmailTemplateService],
})
export class EmailModule {}
