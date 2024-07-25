import { Module } from '@nestjs/common';
import { ApplicationsFlowService } from './applications-flow.service';
import { ApplicationsFlowController } from './applications-flow.controller';

@Module({
  controllers: [ApplicationsFlowController],
  providers: [ApplicationsFlowService],
})
export class ApplicationsFlowModule {}
