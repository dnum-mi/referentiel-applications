import { Module } from '@nestjs/common';
import { RefSensitivityService } from './ref-sensitivity.service';
import { RefSensitivityController } from './ref-sensitivity.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [RefSensitivityController],
  providers: [RefSensitivityService, PrismaService],
})
export class RefSensitivityModule {}
