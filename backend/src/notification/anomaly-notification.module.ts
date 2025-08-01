import { UserModule } from "./../user/user.module";
import { PrismaModule } from "./../prisma/prisma.module";
import { Module } from "@nestjs/common";
import { AnomalyNotificationsService } from "./anomaly-notification.service";
import { AnomalyNotificationsController, ApplicationAnomalyNotificationsController } from "./anomaly-notification.controller";

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [AnomalyNotificationsController, ApplicationAnomalyNotificationsController],
  providers: [AnomalyNotificationsService],
  exports: [AnomalyNotificationsService],
})
export class AnomalyNotificationModule {}
