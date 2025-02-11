import { Module } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ApplicationController } from './application.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { ExportService } from './export.service';
import { UserModule } from 'src/user/user.module';
import { AuthUtils } from 'src/utils/helpers';
import { ApplicationRepository } from './infrastructure/repository/application.repository';

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [ApplicationController],
  providers: [
    ApplicationService,
    ExportService,
    AuthUtils,
    PrismaService,
    ApplicationRepository,
  ],
  exports: [ApplicationRepository],
})
export class ApplicationModule {}
