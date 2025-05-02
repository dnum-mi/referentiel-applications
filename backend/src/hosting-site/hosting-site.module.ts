import { Module } from '@nestjs/common';
import { HostingSiteService } from './hosting-site.service';
import { HostingSiteController } from './hosting-site.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [PrismaModule],
  controllers: [HostingSiteController],
  providers: [HostingSiteService, PrismaService],
  exports: [HostingSiteService],
})
export class HostingSiteModule {}
