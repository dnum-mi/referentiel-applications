import { Module } from '@nestjs/common';
import { HostingService } from './hosting.service';
import { HostingRepository } from './infrastructure/repository/hosting.repository';
import { PrismaModule } from '../prisma/prisma.module';
import {
  HostingController,
  ApplicationHostingsController,
} from './hosting.controller';
import { SitesController } from './site.controller';
import { MetadatasModule } from 'src/metadatas/metadatas.module';
import { ApplicationModule } from 'src/product/application.module';

@Module({
  imports: [PrismaModule, MetadatasModule, ApplicationModule],
  controllers: [
    ApplicationHostingsController,
    SitesController,
    HostingController,
  ],
  providers: [
    HostingService,
    {
      provide: 'IHostingRepository',
      useClass: HostingRepository,
    },
  ],
  exports: ['IHostingRepository'],
})
export class HostingModule {}
