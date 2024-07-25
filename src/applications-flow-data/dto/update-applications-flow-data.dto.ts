import { PartialType } from '@nestjs/swagger';
import { CreateApplicationsFlowDataDto } from './create-applications-flow-data.dto';

export class UpdateApplicationsFlowDataDto extends PartialType(
  CreateApplicationsFlowDataDto,
) {}
