import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class FiltersDto {
  @ApiProperty({
    required: false,
    description: 'Filter platforms by provider ID',
  })
  @IsOptional()
  @IsUUID()
  @IsString()
  providerId?: string;

  @ApiProperty({
    required: false,
    description: 'Filter platforms by hosting site ID',
  })
  @IsOptional()
  @IsUUID()
  @IsString()
  hostingSiteId?: string;
}
