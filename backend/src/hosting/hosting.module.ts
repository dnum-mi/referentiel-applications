import { Module } from '@nestjs/common';
import { HostingService } from './hosting.service';
import { HostingRepository } from './infrastructure/repository/hosting.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { HostingsController } from './hosting.controller';
import { SitesController } from './site.controller';

@Module({
  imports: [PrismaModule],
  controllers: [HostingsController, SitesController],
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
