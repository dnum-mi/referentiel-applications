import { PartialType } from '@nestjs/swagger';
import { CreateUrbanzoneDto } from './create-urbanzone.dto';

export class UpdateUrbanzoneDto extends PartialType(CreateUrbanzoneDto) {}
