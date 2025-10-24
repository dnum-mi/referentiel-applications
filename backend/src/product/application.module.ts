import { Module } from "@nestjs/common";
import { CommonModule } from "src/common/common.module";
import { LabelsModule } from "src/labels/labels.module";
import { MetadatasModule } from "src/metadatas/metadatas.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { ApplicationController } from "./application.controller";

import { ApplicationService } from "./application.service";
import { ExportApplicationsUseCase } from "./application/usecases/application-export.usecase";
import { ApplicationExportService } from "./export.service";
import { ApplicationRepository } from "./infrastructure/repository/application.repository";

@Module({
  imports: [CommonModule, PrismaModule, LabelsModule, MetadatasModule],
  controllers: [ApplicationController],
  providers: [
    ApplicationService,
    ApplicationExportService,
    ExportApplicationsUseCase,
    ApplicationRepository,
  ],
  exports: [
    ApplicationExportService,
    ApplicationRepository,
    ApplicationService,
  ],
})
export class ApplicationModule { }
