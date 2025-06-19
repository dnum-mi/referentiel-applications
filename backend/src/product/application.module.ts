import { Module } from '@nestjs/common';
import { ApplicationController } from './application.controller';
import { ApplicationService } from './application.service';
import { ApplicationExportService } from './export.service';
import { ExportApplicationsUseCase } from './application/usecases/application-export.usecase';
import { ApplicationRepository } from './infrastructure/repository/application.repository';

import { CommonModule } from 'src/common/common.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { LabelsModule } from 'src/labels/labels.module';
import { MetadatasModule } from 'src/metadatas/metadatas.module';
import { ApplicationQualityService } from './quality.service';

@Module({
  imports: [CommonModule, PrismaModule, LabelsModule, MetadatasModule],
  controllers: [ApplicationController],
  providers: [
    ApplicationService,
    ApplicationExportService,
    ExportApplicationsUseCase,
    ApplicationRepository,
    ApplicationQualityService,
  ],
  exports: [
    ApplicationExportService,
    ApplicationRepository,
    ApplicationQualityService,
  ],
})
export class ApplicationModule {}
