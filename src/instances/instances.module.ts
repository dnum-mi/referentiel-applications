import { Module } from '@nestjs/common';
import { InstancesService } from './instances.service';
import { InstancesController } from './instances.controller';

@Module({
  controllers: [InstancesController],
  providers: [InstancesService],
})
export class InstancesModule {}
