import { Module } from "@nestjs/common";
import { CommonModule } from "src/common/common.module";
import { PrismaModule } from "./../prisma/prisma.module";
import { UserModule } from "./../user/user.module";
import {
  ReportsController,
  ApplicationReportsController,
} from "./report.controller";
import { ReportsService } from "./report.service";
import { EmailModule } from "src/email/email.module";
import { NotificationModule } from "src/notification/notification.module";
import { UserNotificationService } from "./user-notification.service";

@Module({
  imports: [
    PrismaModule,
    UserModule,
    EmailModule,
    NotificationModule,
    CommonModule,
  ],
  controllers: [ReportsController, ApplicationReportsController],
  providers: [ReportsService, UserNotificationService],
  exports: [ReportsService],
})
export class ReportModule {}
