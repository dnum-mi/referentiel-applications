import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EmailTemplateService } from "./email-templates.services";
import { EmailService } from "./email.service";

@Module({
  imports: [ConfigModule],
  providers: [EmailService, EmailTemplateService],
  exports: [EmailService, EmailTemplateService],
})
export class EmailModule {}
