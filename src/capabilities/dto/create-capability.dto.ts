import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCapabilityDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  comments: string | null;

  @ApiProperty()
  @IsOptional()
  @IsUUID()
  parentid: string | null;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  label: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  description: string | null;
}
