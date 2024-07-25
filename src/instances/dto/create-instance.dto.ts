import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsDefined,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

class CreateEnvironmentDto {
  @ApiProperty()
  @IsOptional()
  @IsUUID()
  environmentid: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  label: string;
}
export class CreateInstanceDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => CreateEnvironmentDto)
  environment: CreateEnvironmentDto;

  @ApiProperty()
  @IsOptional()
  @IsString()
  comments?: string | null;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  role: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  statut: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  tenant?: string | null;

  @ApiProperty()
  @IsOptional()
  @IsString()
  fip?: string | null;

  @ApiProperty()
  @IsOptional()
  @IsString()
  url?: string | null;

  @ApiProperty()
  @IsOptional()
  @IsDateString()
  deploymentdate?: Date | string | null;
}
