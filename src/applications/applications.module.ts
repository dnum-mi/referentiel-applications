import { Module } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';
import { ApplicationRolesService } from '../application-roles/application-roles.service';
import { InstancesService } from '../instances/instances.service';
import { CompliancesService } from '../compliances/compliances.service';

@Module({
  controllers: [ApplicationsController],
  providers: [
    ApplicationsService,
    ApplicationRolesService,
    InstancesService,
    CompliancesService,
  ],
})
export class ApplicationsModule {}
