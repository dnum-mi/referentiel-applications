import { Module } from '@nestjs/common';
import { CompliancesService } from './compliances.service';
import { CompliancesController } from './compliances.controller';

@Module({
  controllers: [CompliancesController],
  providers: [CompliancesService],
})
export class CompliancesModule {}
