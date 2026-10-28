import { Module } from "@nestjs/common";
import { ApplicationModule } from "src/applications/application.module";
import { CommonModule } from "src/common/common.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { GristClient } from "./grist.client";
import { GristController } from "./grist.controller";
import { GristSyncLockService } from "./grist-sync-lock.service";
import { GristService } from "./grist.service";

@Module({
  imports: [PrismaModule, CommonModule, ApplicationModule],
  controllers: [GristController],
  providers: [GristClient, GristService, GristSyncLockService],
})
export class GristModule {}
