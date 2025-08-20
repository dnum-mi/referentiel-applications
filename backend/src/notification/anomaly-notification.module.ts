import { UserModule } from "./../user/user.module";
import { PrismaModule } from "./../prisma/prisma.module";
import { Module } from "@nestjs/common";
import { AnomalyNotificationService } from "./anomaly-notification.service";
import { AnomalyNotificationsController, ApplicationAnomalyNotificationsController } from "./anomaly-notification.controller";

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [ApplicationAnomalyNotificationsController, AnomalyNotificationsController],
  providers: [AnomalyNotificationService],
  exports: [AnomalyNotificationService],
})
export class AnomalyNotificationModule {}
