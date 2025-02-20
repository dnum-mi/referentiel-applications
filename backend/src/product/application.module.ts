import { Module } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { ApplicationController } from './application.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { ExportService } from './export.service';
import { ApplicationRepository } from './infrastructure/repository/application.repository';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [ApplicationController],
  providers: [
    ApplicationService,
    ExportService,
    PrismaService,
    ApplicationRepository,
  ],
  exports: [ApplicationRepository],
})
export class ApplicationModule {}
