import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MetadatasService } from './metadatas.service';

@Module({
  providers: [MetadatasService, PrismaService],
  exports: [MetadatasService],
})
export class MetadatasModule {}
