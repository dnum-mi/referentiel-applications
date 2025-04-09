import { Module } from '@nestjs/common';
import { ApplicationController } from './application.controller';
import { ApplicationService } from './application.service';
import { ApplicationExportService } from './export.service';
import { ExportApplicationsUseCase } from './application/usecases/application-export.usecase';
import { ApplicationRepository } from './infrastructure/repository/application.repository';

import { CommonModule } from 'src/common/common.module';
import { PrismaModule } from 'src/prisma/prisma.module'; // ✅ ici !
import { LabelsModule } from 'src/labels/labels.module';

@Module({
  imports: [CommonModule, PrismaModule, LabelsModule],
  controllers: [ApplicationController],
  providers: [
    ApplicationService,
    ApplicationExportService,
    ExportApplicationsUseCase,
    ApplicationRepository,
  ],
  exports: [ApplicationExportService, ApplicationRepository],
})
export class ApplicationModule {}
