import { Module } from '@nestjs/common';
import { CompliancesService } from './compliances.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CompliancesController } from './compliances.controller';

@Module({
  controllers: [CompliancesController],
  providers: [CompliancesService, PrismaService],
})
export class CompliancesModule {}
