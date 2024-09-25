import { Module } from '@nestjs/common';
import { AppTypeService } from './app-type.service';
import { AppTypeController } from './app-type.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [AppTypeController],
  providers: [AppTypeService, PrismaService],
})
export class AppTypeModule {}
