import { Module } from '@nestjs/common';
import { UrbanzonesService } from './urbanzones.service';
import { UrbanzonesController } from './urbanzones.controller';

@Module({
  controllers: [UrbanzonesController],
  providers: [UrbanzonesService],
})
export class UrbanzonesModule {}
