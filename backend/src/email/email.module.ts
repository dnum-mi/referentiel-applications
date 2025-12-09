import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "src/prisma/prisma.module";
import { EmailDigestCronService } from "./cron/email-cron.service";
import { EmailTemplateService } from "./email-templates.services";
import { EmailService } from "./email.service";

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [EmailService, EmailTemplateService, EmailDigestCronService],
  exports: [EmailService, EmailTemplateService],
})
export class EmailModule {}
