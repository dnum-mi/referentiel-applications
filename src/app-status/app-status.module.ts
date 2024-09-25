import { Module } from '@nestjs/common';
import { AppStatusService } from './app-status.service';
import { AppStatusController } from './app-status.controller';

@Module({
  providers: [AppStatusService],
  controllers: [AppStatusController]
})
export class AppStatusModule {}
