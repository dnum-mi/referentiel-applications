import { Module } from "@nestjs/common";
import { PrismaModule } from "./../prisma/prisma.module";
import { UserModule } from "./../user/user.module";
import {
  AnomalyNotificationsController,
  ApplicationAnomalyNotificationsController,
} from "./anomaly-notification.controller";
import { AnomalyNotificationsService } from "./anomaly-notification.service";
import { EmailModule } from "src/email/email.module";
import { UserNotificationService } from "./user-notification.service";

@Module({
  imports: [PrismaModule, UserModule, EmailModule],
  controllers: [
    AnomalyNotificationsController,
    ApplicationAnomalyNotificationsController,
  ],
  providers: [AnomalyNotificationsService, UserNotificationService],
  exports: [AnomalyNotificationsService],
})
export class AnomalyNotificationModule {}
