import { ApiProperty } from '@nestjs/swagger';
import { Nature } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateHostingDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  site?: string;

  @ApiProperty({ enum: Nature, required: false })
  @IsEnum(Nature)
  @IsOptional()
  nature?: Nature;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiProperty({ required: false, description: 'ID of the hosting option' })
  @IsOptional()
  @IsString()
  hostingOptionId?: string;

  @ApiProperty()
  @IsUUID()
  applicationId: string;
}
