import { PrismaService } from './../prisma/prisma.service';
import { Module } from '@nestjs/common';
import { HealthCheckController } from './controllers/health-check.controller';

@Module({
  controllers: [HealthCheckController],
  providers: [PrismaService],
})
export class HealthCheckModule {}
