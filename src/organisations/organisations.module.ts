import { Module } from '@nestjs/common';
import { OrganisationsController } from './organisations.controller';
import { OrganisationsService } from './organisations.service';

@Module({
  imports: [],
  controllers: [OrganisationsController],
  providers: [OrganisationsService],
  exports: [],
})
export class OrganisationsModule {}
