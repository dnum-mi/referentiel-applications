import { Module } from '@nestjs/common';
import { ApplicationsFlowDataService } from './applications-flow-data.service';
import { ApplicationsFlowDataController } from './applications-flow-data.controller';

@Module({
  controllers: [ApplicationsFlowDataController],
  providers: [ApplicationsFlowDataService],
})
export class ApplicationsFlowDataModule {}
