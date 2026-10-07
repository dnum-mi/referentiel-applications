import { ApiProperty, PickType } from "@nestjs/swagger";
import { priorityRestart, Status } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";
import { ActorTypeDto } from "src/actorType/dto/actorType.dto";
import { BusinessDivisionDTO } from "src/business-division/dto/business-division.dto";
import { PaginatedResponseDto } from "src/common/dto";
import { ComplianceDto } from "src/compliances/dto/create-compliance.dto";
import { HostingOptionDto } from "src/hosting-option/dto/hosting-option.dto";
import { ApplicationStatusDto } from "src/statuses/dto/application-status.dto";
import { TagDto } from "src/tag/dto/tag.dto";
import { TechnicalDebtInfoDto } from "src/technical-debt-info/dto/create-technical-debt-info.dto";

export class ApplicationDto {
  @IsString()
  id: string;

  @IsString()
  label: string;

  @IsString()
  @IsOptional()
  shortName: string | null;

  @ApiProperty({
    example: "https://example.com/logo.png",
    description: "URL of the application logo",
    nullable: true,
  })
  @IsString()
  logo: string | null;

  @IsString()
  description: string;

  @IsArray()
  targetPopulations: string[];

  @IsArray()
  purposes: string[];

  @ApiProperty({
    name: "status",
    enum: Status,
    description: "Current status of the application",
    enumName: "ApplicationStatus",
  })
  @IsEnum(Status)
  status?: Status;

  @ApiProperty({
    enum: priorityRestart,
    required: false,
    nullable: true,
    enumName: "ApplicationPriorityRestart",
  })
  @IsOptional()
  @IsEnum(priorityRestart)
  priorityRestart?: priorityRestart | null;

  @IsNumber()
  quality: number | null;

  @ApiProperty({
    type: () => ApplicationStatusDto,
    description: "Current status of the application with full details",
    required: false,
    nullable: true,
  })
  @IsOptional()
  @Type(() => ApplicationStatusDto)
  currentStatus?: ApplicationStatusDto | null;

  @ApiProperty({
    type: () => TechnicalDebtInfoDto,
    description: "Technical debt information for the application",
    required: false,
    nullable: true,
  })
  @IsOptional()
  @Type(() => TechnicalDebtInfoDto)
  technicalDebtInfo?: TechnicalDebtInfoDto | null;

  @ApiProperty({
    type: () => [BusinessDivisionDTO],
    description: "Business divisions MOA for the application",
    required: false,
  })
  @IsOptional()
  @IsArray()
  @Type(() => BusinessDivisionDTO)
  businessDivisions?: BusinessDivisionDTO[];
}

export class CountByMonthDto {
  @ApiProperty({
    description: "Month in YYYY-MM format",
    example: "2023-10",
  })
  month: string;

  @ApiProperty({
    description: "Total number of applications for the month",
    example: 150,
  })
  total: number;
}

export class CountByIqDto {
  @ApiProperty({
    description: "Indice de qualité de l'application",
    example: 85,
  })
  iq: number;

  @ApiProperty({
    description: "Total d'applications pour cet indice de qualité",
    example: 30,
  })
  total: number;
}

export class ApplicationSearchHostingDto {
  @ApiProperty() id: string;

  @ApiProperty({ nullable: true }) label: string | null;

  @ApiProperty({ type: () => HostingOptionDto, nullable: true })
  hostingOption: HostingOptionDto | null;
}

export class ApplicationSearchActorOrganizationDto {
  @ApiProperty() id: string;

  @ApiProperty({ nullable: true }) path: string | null;

  @ApiProperty({ nullable: true }) sigle: string | null;
}

export class ApplicationSearchActorDto {
  @ApiProperty() id: string;

  @ApiProperty({ nullable: true }) email: string | null;

  @ApiProperty({ nullable: true }) firstname: string | null;

  @ApiProperty({ nullable: true }) lastname: string | null;

  @ApiProperty({ type: () => ActorTypeDto, nullable: true })
  actorType: ActorTypeDto | null;

  @ApiProperty({
    type: () => ApplicationSearchActorOrganizationDto,
    nullable: true,
  })
  organization: ApplicationSearchActorOrganizationDto | null;
}

/** Ligne de résultat de recherche : `ApplicationDto` enrichi des relations affichées en liste. */
export class ApplicationSearchItemDto extends ApplicationDto {
  @ApiProperty({ type: () => [ApplicationSearchHostingDto] })
  hostings: ApplicationSearchHostingDto[];

  @ApiProperty({ type: () => [TagDto] })
  tags: TagDto[];

  @ApiProperty({ type: () => [ApplicationSearchActorDto] })
  actors: ApplicationSearchActorDto[];

  @ApiProperty({ type: () => ComplianceDto, nullable: true })
  compliance: ComplianceDto | null;

  @ApiProperty({
    description:
      "Meilleur score RGAA (0-100) parmi les conformités RGAA de l'application",
    nullable: true,
    example: 75.5,
  })
  rgaaScorePercentage: number | null;

  @ApiProperty({
    description: "Nombre de consultations de la fiche sur les 12 derniers mois",
  })
  applicationViews: number;
}

export class ApplicationSearchResultDto extends PaginatedResponseDto<ApplicationSearchItemDto> {
  @ApiProperty({
    description:
      "Liste des applications correspondant aux critères de recherche",
    type: [ApplicationSearchItemDto],
  })
  results: ApplicationSearchItemDto[];

  @ApiProperty({
    description:
      "IQ moyen calculé sur l'ensemble des applications correspondant aux critères (toutes pages confondues)",
    example: 72.5,
    nullable: false,
  })
  averageIq: number;

  @ApiProperty({
    description:
      "Liste des applications correspondant aux critères de recherche et legitime au technical debt point",
    type: [ApplicationSearchItemDto],
  })
  technicalDebtPoints: ApplicationSearchItemDto[];
}

export class ApplicationMinimalDto extends PickType(ApplicationDto, [
  "id",
  "label",
] as const) {}

export class QualitySummaryActorsDto {
  @ApiProperty() @IsBoolean() MOA: boolean;
  @ApiProperty() @IsBoolean() MOE: boolean;
  @ApiProperty() @IsBoolean() TMA: boolean;
  @ApiProperty() @IsBoolean() HEB: boolean;
  @ApiProperty() @IsBoolean() REP: boolean;
}

export class QualitySummaryCompliancesDto {
  @ApiProperty() @IsBoolean() DIMA: boolean;
  @ApiProperty() @IsBoolean() PDMA: boolean;
  @ApiProperty() @IsBoolean() HOMOLOGATION: boolean;
  @ApiProperty() @IsBoolean() RGAA: boolean;
  @ApiProperty({ nullable: true }) @IsOptional() @IsBoolean() DSFR:
    | boolean
    | null;
  @ApiProperty({ nullable: true }) @IsOptional() @IsBoolean() RGPD:
    | boolean
    | null;
}

export class QualitySummaryDto {
  @ApiProperty() @IsBoolean() hasDescription: boolean;
  @ApiProperty() @IsBoolean() hasHosting: boolean;
  @ApiProperty() @IsBoolean() hasSnapvisu: boolean;

  @ApiProperty({ type: () => QualitySummaryActorsDto })
  @Type(() => QualitySummaryActorsDto)
  actors: QualitySummaryActorsDto;

  @ApiProperty({ type: () => QualitySummaryCompliancesDto })
  @Type(() => QualitySummaryCompliancesDto)
  compliances: QualitySummaryCompliancesDto;
}

export class QualityCampaignActionDto {
  @ApiProperty({ description: "Identifiant de la campagne concernée" })
  @IsString()
  campaignId: string;

  @ApiProperty({ description: "Nom de la campagne concernée" })
  @IsString()
  campaignName: string;

  @ApiProperty({
    description:
      "Clé de l'action complétée (ex. « moa », « hosting » — cf. le catalogue des actions IQ)",
  })
  @IsString()
  actionKey: string;

  @ApiProperty({ description: "Libellé lisible de l'action complétée" })
  @IsString()
  actionLabel: string;

  @ApiProperty({ description: "Date à laquelle l'action a été complétée" })
  completedAt: Date;

  @ApiProperty({
    required: false,
    nullable: true,
    description: "Email de l'utilisateur à l'origine de l'action, si connu",
  })
  @IsOptional()
  @IsString()
  completedByEmail: string | null;
}
