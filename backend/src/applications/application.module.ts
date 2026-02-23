import { Module } from "@nestjs/common";
import { CommonModule } from "src/common/common.module";
import { MetadatasModule } from "src/metadatas/metadatas.module";
import { PrismaModule } from "src/prisma/prisma.module";

import { PrismaQueryBuilder } from "src/applications/prisma-query-builder.service";
import { BusinessDivisionModule } from "src/business-division/business-division.module";
import { StatusesModule } from "src/statuses/statuses.module";
import { TagsModule } from "src/tag/tags.module";
import { ApplicationController } from "./application.controller";
import { ApplicationService } from "./application.service";
import { ApplicationExportService } from "./export.service";
import { ApplicationRepository } from "./infrastructure/repository/application.repository";
import { ExportApplicationsUseCase } from "./usecases/application-export.usecase";
import { ApplicationViewService } from "./view.service";

@Module({
  imports: [
    CommonModule,
    PrismaModule,
    MetadatasModule,
    StatusesModule,
    TagsModule,
    BusinessDivisionModule,
  ],
  controllers: [ApplicationController],
  providers: [
    ApplicationService,
    ApplicationExportService,
    ApplicationViewService,
    ExportApplicationsUseCase,
    ApplicationRepository,
    PrismaQueryBuilder,
  ],
  exports: [
    ApplicationExportService,
    ApplicationRepository,
    ApplicationService,
  ],
})
export class ApplicationModule {}
