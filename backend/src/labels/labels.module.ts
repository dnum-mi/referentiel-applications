import { Module } from '@nestjs/common';
import { LabelsService } from './labels.service';
import { LabelsController } from './labels.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { MetadatasModule } from 'src/metadatas/metadatas.module';

@Module({
  imports: [MetadatasModule],
  controllers: [LabelsController],
  providers: [LabelsService, PrismaService],
  exports: [LabelsService],
})
export class LabelsModule {}
