import { ApiProperty } from "@nestjs/swagger";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
} from "class-validator";
import { BackupStorage, HomologationStatus, TestResult } from "src/enum";
import {
  DIMA_DURATION_HOURS_VALUES,
  PDMA_DURATION_HOURS_VALUES,
} from "../constants/compliance-metadata.constants";

export class CreateComplianceDto {
  // DIMA specific fields
  @ApiProperty({
    example: 4,
    description: "DIMA duration in hours (one of 96, 72, 48, 24, 4, 1, 0)",
    required: false,
    enum: DIMA_DURATION_HOURS_VALUES,
  })
  @IsOptional()
  @IsInt()
  @IsIn(DIMA_DURATION_HOURS_VALUES)
  dima_duration_hours?: number;

  @ApiProperty({
    example: true,
    description: "DIMA HNO (Heure non ouvrée)",
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  dima_is_hno?: boolean;

  @ApiProperty({
    example: "Perte de revenu, impact client",
    description: "DIMA business impact of interruption",
    required: false,
  })
  @IsOptional()
  @IsString()
  dima_business_impact?: string;

  @ApiProperty({
    example: true,
    description: "DIMA recovery plan exists",
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  dima_recovery_plan?: boolean;

  @ApiProperty({
    example: "Bascule sur serveur de secours",
    description: "DIMA recovery solutions",
    required: false,
  })
  @IsOptional()
  @IsString()
  dima_recovery_solutions?: string;

  @ApiProperty({
    example: "2023-01-01",
    description: "DIMA last test date",
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dima_last_test_date?: string;

  @ApiProperty({
    enum: TestResult,
    description: "DIMA test result",
    required: false,
  })
  @IsOptional()
  @IsEnum(TestResult)
  dima_test_result?: TestResult;

  @ApiProperty({
    example: "Jean Dupont",
    description: "DIMA recovery manager",
    required: false,
  })
  @IsOptional()
  @IsString()
  dima_recovery_manager?: string;

  // PDMA specific fields
  @ApiProperty({
    example: 24,
    description: "PDMA duration in hours (one of 48, 24, 2, 0)",
    required: false,
    enum: PDMA_DURATION_HOURS_VALUES,
  })
  @IsOptional()
  @IsInt()
  @IsIn(PDMA_DURATION_HOURS_VALUES)
  pdma_duration_hours?: number;

  @ApiProperty({
    example: "Transactions, logs, fichiers utilisateur",
    description: "PDMA data types concerned",
    required: false,
  })
  @IsOptional()
  @IsString()
  pdma_data_types?: string;

  @ApiProperty({
    example: "Toutes les heures",
    description: "PDMA backup frequency",
    required: false,
  })
  @IsOptional()
  @IsString()
  pdma_backup_frequency?: string;

  @ApiProperty({
    example: "Snapshot, backup incrémental",
    description: "PDMA backup method used",
    required: false,
  })
  @IsOptional()
  @IsString()
  pdma_backup_method?: string;

  @ApiProperty({
    enum: BackupStorage,
    description: "PDMA backup storage",
    required: false,
  })
  @IsOptional()
  @IsEnum(BackupStorage)
  pdma_backup_storage?: BackupStorage;

  @ApiProperty({
    example: "2023-01-01",
    description: "PDMA last test date",
    required: false,
  })
  @IsOptional()
  @IsDateString()
  pdma_last_test_date?: string;

  @ApiProperty({
    enum: TestResult,
    description: "PDMA test result",
    required: false,
  })
  @IsOptional()
  @IsEnum(TestResult)
  pdma_test_result?: TestResult;

  @ApiProperty({
    example: "Marie Martin",
    description: "PDMA restoration manager",
    required: false,
  })
  @IsOptional()
  @IsString()
  pdma_restoration_manager?: string;

  @ApiProperty({
    enum: HomologationStatus,
    description: "Homologation status",
    required: false,
  })
  @IsOptional()
  @IsEnum(HomologationStatus)
  homologation_status?: HomologationStatus;

  @ApiProperty({
    example: "2023-01-01",
    description: "Homologation date end",
    required: false,
  })
  @IsOptional()
  @IsDateString()
  homologation_date_end?: string;

  @ApiProperty({
    example: "uuid-of-rssi-actor",
    description: "Homologation RSSI actor ID",
    required: false,
  })
  @IsOptional()
  @IsString()
  homologation_rssi_id?: string;

  // DSFR specific fields
  @ApiProperty({
    example: true,
    description: "DSFR implemented",
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  dsfr_implemented?: boolean;

  @ApiProperty({
    example: "1.9.0",
    description: "DSFR version used",
    required: false,
  })
  @IsOptional()
  @IsString()
  dsfr_version?: string;

  // RGPD specific fields
  @ApiProperty({
    example: true,
    description: "RGPD has AIPD",
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  rgpd_has_aipd?: boolean;

  @ApiProperty({
    example: "Pierre Durand",
    description: "RGPD DPO name",
    required: false,
  })
  @IsOptional()
  @IsString()
  rgpd_dpo_name?: string;

  @ApiProperty({
    example: "https://service.example.com",
    description: "EcoIndex target URL used for scan",
    required: false,
  })
  @IsOptional()
  @IsString()
  eco_index_target_url?: string;
}

export class ComplianceDto extends CreateComplianceDto {
  @ApiProperty({
    example: "12345678-1234-1234-1234-123456789012",
    description: "Unique identifier of the compliance record",
    required: true,
  })
  @IsString()
  id: string;

  @ApiProperty({
    example: 72.5,
    description: "EcoIndex score (0-100)",
    required: false,
  })
  eco_index_score?: number;

  @ApiProperty({
    example: 1.77,
    description: "EcoIndex greenhouse gas emissions (gCO2e)",
    required: false,
  })
  eco_index_ges?: number;

  @ApiProperty({
    example: 2.65,
    description: "EcoIndex water consumption (cl)",
    required: false,
  })
  eco_index_water?: number;

  @ApiProperty({
    type: String,
    format: "date-time",
    example: "2026-03-20T10:30:00.000Z",
    description: "EcoIndex last calculation datetime",
    required: false,
  })
  eco_index_last_calculated_at?: Date;
}
