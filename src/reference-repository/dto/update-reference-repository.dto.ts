import { PartialType } from '@nestjs/swagger';
import { CreateReferenceRepositoryDto } from './create-reference-repository.dto';

export class UpdateReferenceRepositoryDto extends PartialType(CreateReferenceRepositoryDto) {}
