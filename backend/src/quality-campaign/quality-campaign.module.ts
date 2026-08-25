import { Module } from "@nestjs/common";
import { ApplicationModule } from "src/applications/application.module";
import { CommonModule } from "src/common/common.module";
import { EmailModule } from "src/email/email.module";
import { NotificationModule } from "src/notification/notification.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { QualityCampaignCronService } from "./cron/quality-campaign-cron.service";
import { QualityCampaignController } from "./quality-campaign.controller";
import { QualityCampaignService } from "./quality-campaign.service";

@Module({
  imports: [
    PrismaModule,
    CommonModule,
    ApplicationModule,
    EmailModule,
    NotificationModule,
  ],
  controllers: [QualityCampaignController],
  providers: [QualityCampaignService, QualityCampaignCronService],
})
export class QualityCampaignModule {}
