import { Module } from "@nestjs/common";
import { CommonModule } from "src/common/common.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { TechnologyController } from "./technology.controller";
import { EndOfLifeController } from "./end-of-life.controller";
import { EndOfLifeService } from "./end-of-life.service";
import { EolRefreshService } from "./eol-refresh.service";
import { EolNotificationService } from "./eol-notification.service";
import { NotificationModule } from "src/notification/notification.module";
import { TechnologyService } from "./technology.service";
import { MetadatasModule } from "src/metadatas/metadatas.module";
import { ApplicationModule } from "src/applications/application.module";

@Module({
  imports: [
    MetadatasModule,
    PrismaModule,
    CommonModule,
    ApplicationModule,
    NotificationModule,
  ],
  controllers: [TechnologyController, EndOfLifeController],
  providers: [
    TechnologyService,
    EndOfLifeService,
    EolRefreshService,
    EolNotificationService,
  ],
  exports: [
    TechnologyService,
    EndOfLifeService,
    EolRefreshService,
    EolNotificationService,
  ],
})
export class TechnologyModule {}
