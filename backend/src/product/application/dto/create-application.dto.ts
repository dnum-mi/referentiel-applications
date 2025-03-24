import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ApiProperty,
  ApiPropertyOptional,
  ApiHideProperty,
} from '@nestjs/swagger';
import { ComplianceStatus, ComplianceType } from 'src/enum';

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
  validityStart?: string | null;

  @ApiProperty({
    example: '2025-01-01',
    description: 'End date of validity',
    required: false,
  })
  @IsOptional()
  @IsDateString()
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
export class UpdateComplianceDto {
  @IsOptional()
  @ApiHideProperty()
  id?: string;

  @ApiProperty({ enum: ComplianceType, required: false })
  @IsOptional()
  @IsEnum(ComplianceType)
  type?: ComplianceType;

  @ApiProperty({
    example: 'Regulation',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string | null;

  @ApiProperty({ enum: ComplianceStatus, required: false })
  @IsOptional()
  @IsEnum(ComplianceStatus)
  status?: ComplianceStatus;

  @ApiProperty({
    example: '2023-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  validityStart?: string | null;

  @ApiProperty({
    example: '2029-12-31',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  validityEnd?: string | null;

  @ApiProperty({
    example: '42',
    required: false,
  })
  @IsOptional()
  @IsString()
  scoreValue?: string | null;

  @ApiProperty({
    example: '%',
    required: false,
  })
  @IsOptional()
  @IsString()
  scoreUnit?: string | null;

  @ApiProperty({
    example: 'Renseignements sur la conformité',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class CreateApplicationDto {
  @ApiProperty({
    example: 'My Application',
    description: 'Label of the application',
  })
  @IsString()
  label: string;

  @ApiProperty({
    example: 'metadata456',
    description: 'Metadata ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  metadataId?: string;

  @ApiProperty({
    example: 'short-app-name',
    description: 'Short name of the application',
    required: false,
  })
  @IsOptional()
  @IsString()
  shortName: string;

  @ApiProperty({
    example: 'http://example.com/logo.png',
    description: 'Logo URL of the application',
    required: false,
  })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiProperty({
    example: 'An amazing application',
    description: 'Description of the application',
  })
  @IsString()
  description: string;

  @ApiProperty({
    type: [String],
    example: ['population 1', 'population 2'],
    description: 'population associated with the application',
    required: false,
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  targetPopulations?: string[];

  @ApiProperty({
    type: [String],
    example: ['finance', 'HR'],
    description: 'Purposes of the application',
    required: false,
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  purposes?: string[];

  @ApiProperty({
    type: [String],
    example: ['tag1', 'tag2'],
    description: 'Tags associated with the application',
    required: false,
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({
    example: 'parentApp123',
    description: 'Parent application ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiProperty({
    type: [CreateComplianceDto],
    description: 'Liste des conformités associées à l’application',
    example: [
      {
        type: 'security',
        name: 'ISO 27001',
        status: 'compliant',
        validityStart: '2024-01-01T00:00:00.000Z',
        validityEnd: '2026-12-31T23:59:59.000Z',
        scoreValue: '95',
        scoreUnit: '%',
        notes: 'Fully compliant with security standards.',
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateComplianceDto)
  compliances: CreateComplianceDto[];
}

export class PatchApplicationDto {
  @ApiProperty({
    example: 'My Application',
    description: 'Label of the application',
  })
  @IsOptional()
  @IsString()
  label: string;

  @ApiProperty({
    example: 'metadata456',
    description: 'Metadata ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  metadataId?: string;

  @ApiProperty({
    example: 'short-app-name',
    description: 'Short name of the application',
    required: false,
  })
  @IsOptional()
  @IsString()
  shortName: string;

  @ApiProperty({
    example: 'http://example.com/logo.png',
    description: 'Logo URL of the application',
    required: false,
  })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiProperty({
    example: 'An amazing application',
    description: 'Description of the application',
  })
  @IsOptional()
  @IsString()
  description: string;

  @ApiProperty({
    type: [String],
    example: ['finance', 'HR'],
    description: 'Purposes of the application',
    required: false,
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  purposes?: string[];

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  targetPopulations?: string[];

  @ApiProperty({
    type: [String],
    example: ['tag1', 'tag2'],
    description: 'Tags associated with the application',
    required: false,
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({
    example: 'parentApp123',
    description: 'Parent application ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ type: [UpdateComplianceDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateComplianceDto)
  compliances?: UpdateComplianceDto[];
}
