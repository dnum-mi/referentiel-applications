import { PartialType } from '@nestjs/swagger';
import { CreateCapabilityDto } from './create-capability.dto';

export class UpdateCapabilityDto extends PartialType(CreateCapabilityDto) {}
