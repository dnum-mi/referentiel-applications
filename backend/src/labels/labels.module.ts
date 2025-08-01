import { Module } from '@nestjs/common';
import { LabelsService } from './labels.service';
import { LabelsController } from './labels.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { MetadataModule } from 'src/metadata/metadata.module';

@Module({
  imports: [MetadataModule],
  controllers: [LabelsController],
  providers: [LabelsService, PrismaService],
  exports: [LabelsService],
})
export class LabelsModule { }
