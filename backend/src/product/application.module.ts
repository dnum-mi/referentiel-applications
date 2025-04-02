import { Module } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { ApplicationController } from './application.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { ApplicationRepository } from './infrastructure/repository/application.repository';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserModule } from '../user/user.module';
import { LabelsService } from 'src/labels/labels.service';
import { ApplicationExportService } from './export.service';

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [ApplicationController],
  providers: [
    ApplicationService,
    ApplicationExportService,
    PrismaService,
    LabelsService,
    ApplicationRepository,
  ],
  exports: [ApplicationRepository],
})
export class ApplicationModule {}
