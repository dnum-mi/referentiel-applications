import { Module } from "@nestjs/common";
import { MetadataModule } from "src/metadata/metadata.module";
import { ApplicationModule } from "src/product/application.module";
import { PrismaModule } from "../prisma/prisma.module";
import {
  ApplicationHostingsController,
  HostingController,
} from "./hosting.controller";
import { HostingService } from "./hosting.service";
import { HostingRepository } from "./infrastructure/repository/hosting.repository";
import { SitesController } from "./site.controller";

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
