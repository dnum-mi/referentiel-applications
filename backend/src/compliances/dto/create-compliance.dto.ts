import { ApiProperty } from '@nestjs/swagger';
import { ComplianceStatus, ComplianceType } from 'src/enum';
import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateComplianceDto {
  @ApiProperty({
    enum: ComplianceType,
    description: 'Type of compliance (e.g., regulation, policy)',
  })
  @IsEnum(ComplianceType)
  @IsOptional()
  type: ComplianceType;

  @ApiProperty({ example: 'GDPR', description: 'Name of the compliance' })
  @IsString()
  @IsOptional()
  name: string | null;

  @ApiProperty({
    enum: ComplianceStatus,
    description: 'Compliance status (e.g., compliant, non_compliant)',
  })
  @IsOptional()
  @IsEnum(ComplianceStatus)
  status: ComplianceStatus;

  @ApiProperty({
    example: '2023-01-01',
    description: 'Start date of validity',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => new Date(value).toISOString())
  validityStart?: string | null;

  @ApiProperty({
    example: '2025-01-01',
    description: 'End date of validity',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => new Date(value).toISOString())
  validityEnd?: string | null;

  @ApiProperty({
    example: '85',
    description: 'Score value (if applicable)',
    required: false,
  })
  @IsOptional()
  @IsString()
  scoreValue?: string | null;

  @ApiProperty({
    example: '%',
    description: 'Score unit (if applicable)',
    required: false,
  })
  @IsOptional()
  @IsString()
  scoreUnit?: string | null;

  @ApiProperty({
    example: 'Notes about the compliance',
    description: 'Additional notes',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string | null;
}
