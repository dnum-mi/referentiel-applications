import { Module } from "@nestjs/common";
import { HostingService } from "./hosting.service";
import { HostingRepository } from "./infrastructure/repository/hosting.repository";
import { PrismaModule } from "../prisma/prisma.module";
import {
  HostingController,
  ApplicationHostingsController,
} from "./hosting.controller";
import { SitesController } from "./site.controller";
import { MetadataModule } from "src/metadata/metadata.module";
import { ApplicationModule } from "src/product/application.module";

@Module({
  imports: [PrismaModule, MetadataModule, ApplicationModule],
  controllers: [
    ApplicationHostingsController,
    SitesController,
    HostingController,
  ],
  providers: [
    HostingService,
    {
      provide: "IHostingRepository",
      useClass: HostingRepository,
    },
  ],
  exports: ["IHostingRepository"],
})
export class HostingModule { }
