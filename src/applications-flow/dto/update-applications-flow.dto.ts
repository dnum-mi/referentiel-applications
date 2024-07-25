import { PartialType } from '@nestjs/swagger';
import { CreateApplicationsFlowDto } from './create-applications-flow.dto';

export class UpdateApplicationsFlowDto extends PartialType(
  CreateApplicationsFlowDto,
) {}
