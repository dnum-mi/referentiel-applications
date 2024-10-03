import { PartialType } from '@nestjs/swagger';
import { CreateMetadatumDto } from './create-metadatum.dto';

export class UpdateMetadatumDto extends PartialType(CreateMetadatumDto) {}
