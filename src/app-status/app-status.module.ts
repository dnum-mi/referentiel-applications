import { Module } from '@nestjs/common';
import { AppStatusService } from './app-status.service';
import { AppStatusController } from './app-status.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [AppStatusController],
  providers: [AppStatusService, PrismaService],
})
export class AppStatusModule {}
