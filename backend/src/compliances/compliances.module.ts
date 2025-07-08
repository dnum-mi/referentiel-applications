import { Module } from '@nestjs/common';
import { CompliancesService } from './compliances.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  ApplicationCompliancesController,
  ComplianceController,
} from './compliances.controller';
import { MetadatasModule } from 'src/metadatas/metadatas.module';
import { ApplicationModule } from 'src/product/application.module';

@Module({
  imports: [MetadatasModule, ApplicationModule],
  controllers: [ApplicationCompliancesController, ComplianceController],
  providers: [CompliancesService, PrismaService],
})
export class CompliancesModule {}
