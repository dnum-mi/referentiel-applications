import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { AppComplianceLevel } from '../entities/compliance.entity';

export class CreateComplianceDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  comments: string | null;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  compliancetype: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @IsEnum(AppComplianceLevel)
  compliancelevel: AppComplianceLevel;

  @ApiProperty()
  @IsOptional()
  @IsDateString()
  decisiondate: Date | null;

  @ApiProperty()
  @IsOptional()
  @IsDateString()
  validitydate: Date | null;

  @ApiProperty()
  @IsOptional()
  @IsDateString()
  auditdate: Date | null;

  @ApiProperty()
  @IsOptional()
  @IsString()
  description: string | null;
}
