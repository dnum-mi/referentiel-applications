import { ApiProperty } from "@nestjs/swagger";
import { TestResult, BackupStorage } from "src/enum";
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from "class-validator";

export class CreateComplianceDto {
  // DIMA specific fields
  @ApiProperty({
    example: 4,
    description: "DIMA duration in hours (1, 4, 8, 12, 24, 48, 72)",
    required: false,
  })
  @IsOptional()
  @IsInt()
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
    example: 8,
    description: "PDMA duration in hours (1, 4, 8, 12, 24, 48, 72)",
    required: false,
  })
  @IsOptional()
  @IsInt()
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

  // Homologation specific fields
  @ApiProperty({
    example: "2023-01-01",
    description: "Homologation date",
    required: false,
  })
  @IsOptional()
  @IsDateString()
  homologation_date?: string;

  @ApiProperty({
    example: 12,
    description: "Homologation duration in months",
    required: false,
  })
  @IsOptional()
  @IsInt()
  homologation_duration_months?: number;

  @ApiProperty({
    example: "uuid-of-rssi-actor",
    description: "Homologation RSSI actor ID",
    required: false,
  })
  @IsOptional()
  @IsString()
  homologation_rssi_id?: string;

  // RGAA specific fields
  @ApiProperty({
    example: "2023-01-01",
    description: "RGAA audit date",
    required: false,
  })
  @IsOptional()
  @IsDateString()
  rgaa_audit_date?: string;

  @ApiProperty({
    example: "https://service.example.com",
    description: "RGAA service URL",
    required: false,
  })
  @IsOptional()
  @IsString()
  rgaa_service_url?: string;

  @ApiProperty({
    example: "https://service.example.com/accessibilite",
    description: "RGAA accessibility page URL",
    required: false,
  })
  @IsOptional()
  @IsString()
  rgaa_accessibility_url?: string;

  @ApiProperty({
    example: 85,
    description: "RGAA score percentage (0-100)",
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  rgaa_score_percentage?: number;

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
}
