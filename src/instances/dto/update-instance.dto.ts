import { PartialType } from '@nestjs/swagger';
import { CreateInstanceDto } from './create-instance.dto';

export class UpdateInstanceDto extends PartialType(CreateInstanceDto) {}
