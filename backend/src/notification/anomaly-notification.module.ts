import { Module } from "@nestjs/common";
import { PrismaModule } from "./../prisma/prisma.module";
import { UserModule } from "./../user/user.module";
import {
  AnomalyNotificationsController,
  ApplicationAnomalyNotificationsController,
} from "./anomaly-notification.controller";
import { AnomalyNotificationsService } from "./anomaly-notification.service";

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [
    AnomalyNotificationsController,
    ApplicationAnomalyNotificationsController,
  ],
  providers: [AnomalyNotificationsService],
  exports: [AnomalyNotificationsService],
})
export class AnomalyNotificationModule {}
