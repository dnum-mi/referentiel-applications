import { Module } from "@nestjs/common";
import { CommonModule } from "src/common/common.module";
import { PrismaModule } from "../prisma/prisma.module";
import { NotificationController } from "./notification.controller";
import { NotificationService } from "./notification.service";

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
