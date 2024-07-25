import { Controller, Get, Param } from '@nestjs/common';
import { CompliancesService } from './compliances.service';

import { Resource } from '../auth/policies-guard.guard';
import { UUIDParam } from 'src/global-dto/uuid-param.dto';
import { ApiTags } from '@nestjs/swagger';

@Resource('Compliance')
@Controller('compliances')
@ApiTags('Application-Compliances')
export class CompliancesController {
  constructor(private readonly compliancesService: CompliancesService) {}

  @Get('/application/:id')
  async getComplianceByAppId(@Param() params: UUIDParam) {
    return this.compliancesService.getComplianceByAppId(params.id);
  }
}
