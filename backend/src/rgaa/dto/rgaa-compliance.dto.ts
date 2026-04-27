import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export class CreateRgaaComplianceDto {
  @ApiProperty({
    example: "2024-01-15",
    description: "Date de l'audit RGAA",
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  audit_date?: string | null;

  @ApiProperty({
    example: "https://service.example.gouv.fr",
    description: "URL du service web audité",
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  service_url?: string | null;

  @ApiProperty({
    example: "https://service.example.gouv.fr/accessibilite",
    description: "URL de la déclaration d'accessibilité",
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  accessibility_url?: string | null;

  @ApiProperty({
    example: 85.5,
    description: "Score de conformité RGAA en pourcentage (0-100)",
    required: false,
    nullable: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  score_percentage?: number | null;
}

export class RgaaComplianceDto extends CreateRgaaComplianceDto {
  @ApiProperty({
    example: "12345678-1234-1234-1234-123456789012",
    description: "Identifiant unique de la conformité RGAA",
  })
  @IsString()
  id: string;

  @ApiProperty({
    example: "12345678-1234-1234-1234-123456789012",
    description: "Identifiant de l'application",
  })
  @IsString()
  applicationId: string;
}
