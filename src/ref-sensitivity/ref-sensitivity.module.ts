import { Module } from '@nestjs/common';
import { RefSensitivityService } from './ref-sensitivity.service';
import { RefSensitivityController } from './ref-sensitivity.controller';

@Module({
  providers: [RefSensitivityService],
  controllers: [RefSensitivityController]
})
export class RefSensitivityModule {}
