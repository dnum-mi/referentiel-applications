import { Module } from "@nestjs/common";
import { PrismaModule } from "./../prisma/prisma.module";
import { UserModule } from "./../user/user.module";
import {
  ReportsController,
  ApplicationReportsController,
} from "./report.controller";
import { ReportsService } from "./report.service";
import { EmailModule } from "src/email/email.module";
import { UserNotificationService } from "./user-notification.service";

@Module({
  imports: [PrismaModule, UserModule, EmailModule],
  controllers: [ReportsController, ApplicationReportsController],
  providers: [ReportsService, UserNotificationService],
  exports: [ReportsService],
})
export class ReportModule {}
