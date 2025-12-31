import { Module } from "@nestjs/common";
import { MetadatasModule } from "src/metadatas/metadatas.module";
import { ApplicationModule } from "src/product/application.module";
import { PrismaModule } from "../prisma/prisma.module";
import {
  ApplicationHostingsController,
  HostingsController,
} from "./hostings.controller";
import { HostingsService } from "./hostings.service";
import { HostingRepository } from "./infrastructure/repository/hosting.repository";
import { SitesController } from "./site.controller";

@Module({
  imports: [PrismaModule, MetadatasModule, ApplicationModule],
  controllers: [
    ApplicationHostingsController,
    SitesController,
    HostingsController,
  ],
  providers: [
    HostingsService,
    {
      provide: "IHostingRepository",
      useClass: HostingRepository,
    },
  ],
  exports: ["IHostingRepository"],
})
export class HostingsModule {}
