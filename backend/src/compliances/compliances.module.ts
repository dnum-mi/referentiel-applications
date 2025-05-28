import { Module } from '@nestjs/common';
import { CompliancesService } from './compliances.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CompliancesController } from './compliances.controller';
import { MetadatasModule } from 'src/metadatas/metadatas.module';

@Module({
  imports: [MetadatasModule],
  controllers: [CompliancesController],
  providers: [CompliancesService, PrismaService],
})
export class CompliancesModule {}
