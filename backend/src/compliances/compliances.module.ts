import { Module } from '@nestjs/common';
import { CompliancesService } from './compliances.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  ApplicationCompliancesController,
  ComplianceController,
} from './compliances.controller';
import { MetadataModule } from 'src/metadata/metadata.module';
import { ApplicationModule } from 'src/product/application.module';

@Module({
  imports: [MetadataModule, ApplicationModule],
  controllers: [ApplicationCompliancesController, ComplianceController],
  providers: [CompliancesService, PrismaService],
})
export class CompliancesModule { }
