import { Module } from '@nestjs/common';
import { ApplicationRolesService } from './application-roles.service';
import { ApplicationRolesController } from './application-roles.controller';

@Module({
  controllers: [ApplicationRolesController],
  providers: [ApplicationRolesService],
})
export class ApplicationRolesModule {}
