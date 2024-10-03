import { PartialType } from '@nestjs/swagger';
import { CreateComplianceDto } from './create-compliance.dto';

export class UpdateComplianceDto extends PartialType(CreateComplianceDto) {}
