import { Module } from '@nestjs/common';
import { HostingService } from './hosting.service';
import { HostingRepository } from './infrastructure/repository/hosting.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { HostingsController } from './hosting.controller';
import { SitesController } from './site.controller';
import { MetadatasModule } from 'src/metadatas/metadatas.module';
import { ApplicationService } from 'src/product/application.service';

@Module({
  imports: [PrismaModule, MetadatasModule],
  controllers: [HostingsController, SitesController],
  providers: [
    HostingService,
    {
      provide: 'IHostingRepository',
      useClass: HostingRepository,
    },
    ApplicationService,
  ],
  exports: ['IHostingRepository'],
})
export class HostingModule {}
