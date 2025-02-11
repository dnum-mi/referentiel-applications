import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsDateString,
  ValidateNested,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ApiProperty,
  ApiPropertyOptional,
  ApiHideProperty,
} from '@nestjs/swagger';
import {
  ActorType,
  ComplianceStatus,
  ComplianceType,
  ExternalRessourceType,
  LifecycleStatus,
} from '../../../enum';

export class CreateActorDto {
  @ApiProperty({
    example: '',
    description: '',
  })
  @IsString()
  @IsOptional()
  role: string;

  @ApiProperty({
    example: 'user123',
    description: '',
    required: false,
  })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({
    example: 'example@example.com',
    description: 'Email of the actor (optional)',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ enum: ActorType, required: false })
  @IsOptional()
  @IsEnum(ActorType)
  type?: ActorType;

  @ApiProperty({
    example: 'orgSource123',
    description: 'ID of the organization source (optional)',
    required: false,
  })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({
    example: 'app789',
    description: 'ID of the associated application (optional)',
    required: false,
  })
  @IsOptional()
  @IsString()
  applicationId?: string;
}

export class UpdateActorUserDto {
  @IsOptional()
  @IsString()
  keycloakId?: string;

  @IsOptional()
  @IsString()
  email?: string;
}

export class UpdateActorDto {
  @IsOptional()
  @ApiHideProperty()
  id?: string;

  @ApiProperty({
    example: 'admin',
    required: false,
  })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({
    example: 'example@example.com',
    description: 'Email of the actor (optional)',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  // @ApiProperty({
  //   example: '',
  //   description: '',
  //   required: false,
  // })
  // @IsEmail()
  // @IsOptional()
  // organizationId?: string;

  @ApiProperty({ enum: ActorType, required: false })
  @IsOptional()
  @IsEnum(ActorType)
  actorType?: ActorType;

  // @IsOptional()
  // @ValidateNested()
  // @Type(() => UpdateActorUserDto)
  // user?: UpdateActorUserDto;
}

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

export class UpdateLifecycleDto {
  @ApiProperty({
    enum: LifecycleStatus,
    required: false,
  })
  @IsEnum(LifecycleStatus)
  @IsOptional()
  status?: LifecycleStatus;

  @ApiProperty({
    example: '2023-11-22',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  firstProductionDate?: string;

  @ApiProperty({
    example: '2025-12-31',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  plannedDecommissioningDate?: string;

  @ApiProperty({
    example: 'metadata123',
    required: false,
  })
  @IsOptional()
  @IsString()
  metadataId?: string;
}
export class CreateLifecycleDto {
  @ApiProperty({
    enum: LifecycleStatus,
    description: 'Status of the lifecycle (e.g., in_production)',
  })
  @IsEnum(LifecycleStatus)
  @IsOptional()
  status: LifecycleStatus;

  @ApiProperty({
    example: '2023-11-22',
    description: 'First production date (ISO 8601)',
  })
  @IsDateString()
  @IsOptional()
  firstProductionDate?: string;

  @ApiProperty({
    example: '2025-12-31',
    description: 'Planned decommissioning date (ISO 8601)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  plannedDecommissioningDate?: string;

  @ApiProperty({
    example: 'metadata123',
    description: 'Associated metadata ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  metadataId?: string;
}

export class UpdateExternalRessourceDto {
  @ApiHideProperty()
  @IsOptional()
  id?: string;

  @ApiProperty({
    example: 'https://example.com/document.pdf',
    required: false,
  })
  @IsOptional()
  @IsString()
  link?: string | null;

  @ApiProperty({
    example: 'Document example',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({ enum: ExternalRessourceType, required: false })
  @IsOptional()
  @IsEnum(ExternalRessourceType)
  type?: ExternalRessourceType;
}
export class CreateExternalRessourceDto {
  @ApiProperty({
    example: 'https://doc.fr',
    description: 'Link of the external ressource',
  })
  @IsString()
  @IsOptional()
  link: string | null;

  @ApiProperty({
    example: "documentation de l'application",
    description: 'Description of the external ressource',
    required: false,
  })
  @IsString()
  @IsOptional()
  description: string | null;

  @ApiProperty({
    enum: ExternalRessourceType,
    description:
      'Type of external ressource (service, documentation, supervision)',
  })
  @IsEnum(ExternalRessourceType)
  @IsOptional()
  type: ExternalRessourceType;
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

  @ApiProperty({ type: CreateLifecycleDto })
  @ValidateNested()
  @Type(() => CreateLifecycleDto)
  lifecycle: CreateLifecycleDto = {
    status: LifecycleStatus.UNDER_CONSTRUCTION,
    firstProductionDate: new Date().toISOString(),
  };

  @ApiProperty({
    type: [CreateActorDto],
    description: "Liste des acteurs associés à l'application",
    example: [{ type: 'Responsable', email: 'exemple@exemple.fr' }],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateActorDto)
  actors: CreateActorDto[];

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

  @ApiPropertyOptional({
    type: [CreateExternalRessourceDto],
    description: "Ressources externes (liens) associées à l'application",
    example: [
      {
        link: 'https://example.com/document.pdf',
        description: "Documentation de l'application",
        type: 'documentation',
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExternalRessourceDto)
  externalRessource?: CreateExternalRessourceDto[];
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

  @ApiPropertyOptional({ type: [UpdateLifecycleDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateLifecycleDto)
  lifecycle?: UpdateLifecycleDto;

  @ApiPropertyOptional({ type: [UpdateActorDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateActorDto)
  actors?: UpdateActorDto[];

  @ApiPropertyOptional({ type: [UpdateComplianceDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateComplianceDto)
  compliances?: UpdateComplianceDto[];

  @ApiPropertyOptional({ type: [UpdateExternalRessourceDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateExternalRessourceDto)
  externalRessource?: UpdateExternalRessourceDto[];
}
