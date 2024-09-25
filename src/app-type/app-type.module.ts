import { Module } from '@nestjs/common';
import { AppTypeService } from './app-type.service';
import { AppTypeController } from './app-type.controller';

@Module({
  providers: [AppTypeService],
  controllers: [AppTypeController]
})
export class AppTypeModule {}
