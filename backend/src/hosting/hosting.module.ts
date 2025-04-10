import { Module } from '@nestjs/common';
import { HostingService } from './hosting.service';
import { HostingRepository } from './infrastructure/repository/hosting.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { HostingsController } from './hosting.controller';
import { SitesController } from './site.controller';
import { PlatformsController } from './plateforms.controller';

@Module({
  imports: [PrismaModule],
  controllers: [HostingsController, SitesController, PlatformsController],
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
