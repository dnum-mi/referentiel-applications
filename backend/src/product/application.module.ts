import { Module } from "@nestjs/common";
import { ApplicationController } from "./application.controller";
import { ApplicationService } from "./application.service";
import { ApplicationExportService } from "./export.service";
import { ExportApplicationsUseCase } from "./application/usecases/application-export.usecase";
import { ApplicationRepository } from "./infrastructure/repository/application.repository";

import { CommonModule } from "src/common/common.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { LabelsModule } from "src/labels/labels.module";
import { MetadataModule } from "src/metadata/metadata.module";

@Module({
  imports: [CommonModule, PrismaModule, LabelsModule, MetadataModule],
  controllers: [ApplicationController],
  providers: [
    ApplicationService,
    ApplicationExportService,
    ExportApplicationsUseCase,
    ApplicationRepository,
    ApplicationService,
  ],
  exports: [
    ApplicationExportService,
    ApplicationRepository,
    ApplicationService,
  ],
})
export class ApplicationModule { }
