import { Module } from "@nestjs/common";
import { MetadatasModule } from "src/metadatas/metadatas.module";
import { ApplicationModule } from "src/applications/application.module";
import { PrismaModule } from "../prisma/prisma.module";
import {
  ApplicationHostingsController,
  HostingsController,
} from "./hostings.controller";
import { HostingsService } from "./hostings.service";
import { SitesController } from "./site.controller";

@Module({
  imports: [PrismaModule, MetadatasModule, ApplicationModule],
  controllers: [
    ApplicationHostingsController,
    SitesController,
    HostingsController,
  ],
  providers: [HostingsService],
  exports: [HostingsService],
})
export class HostingsModule {}
