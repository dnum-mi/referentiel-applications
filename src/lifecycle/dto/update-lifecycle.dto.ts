import { PartialType } from '@nestjs/swagger';
import { CreateLifecycleDto } from './create-lifecycle.dto';

export class UpdateLifecycleDto extends PartialType(CreateLifecycleDto) {}
