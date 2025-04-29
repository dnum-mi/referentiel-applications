import { ApiProperty } from '@nestjs/swagger';
import { Nature } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateHostingDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  region?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  site?: string;

  @ApiProperty({ enum: Nature })
  @IsEnum(Nature)
  @IsOptional()
  nature: Nature;

  @ApiProperty()
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  platformId?: string;

  @ApiProperty()
  @IsUUID()
  applicationId: string;
}
