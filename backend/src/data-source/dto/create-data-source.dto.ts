import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateDataSourceDto {
  @ApiProperty({
    example: "Base de données RH",
    description: "Nom d'usage de la source de donnée",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    example: "Contient l'ensemble des dossiers agents du ministère.",
    description: "Description détaillée de la source",
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: "Indicateur Donnée référentielle (officielle et faisant foi)",
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isReference?: boolean;

  @ApiPropertyOptional({
    example: "ID_AGENT; NOM; PRENOM",
    description: "Échantillon de données ou format des champs",
  })
  @IsString()
  @IsOptional()
  example?: string;

  @ApiPropertyOptional({
    example: "10 ans",
    description: "Durée de conservation",
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  conservation?: string;

  @ApiPropertyOptional({
    example: "DB_PROD_RH",
    description: "Nom de l'instance de la base de données hôte",
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  databaseName?: string;

  @ApiPropertyOptional({
    example: "t_agents_details",
    description: "Nom technique de la table ou du fichier",
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  databaseTableName?: string;

  @ApiPropertyOptional({
    example: 40,
    description: "Nombre total de colonnes/champs",
  })
  @IsInt()
  @IsOptional()
  fieldCount?: number;

  @ApiPropertyOptional({
    description: "Liste textuelle des champs/colonnes",
  })
  @IsString()
  @IsOptional()
  fields?: string;

  @ApiPropertyOptional({
    example: 150000,
    description: "Nombre actuel d'enregistrements",
  })
  @IsInt()
  @IsOptional()
  volumetry?: number;

  @ApiPropertyOptional({
    example: 500,
    description: "Nouveaux enregistrements par mois",
  })
  @IsInt()
  @IsOptional()
  monthlyVolumetry?: number;

  @ApiPropertyOptional({
    example: "5708d232-8338-4abf-8f38-8370acc89497",
    description: "ID du type de support (DataSourceType)",
  })
  @IsString()
  @IsOptional()
  typeId?: string;

  @ApiPropertyOptional({
    example: "5708d232-8338-4abf-8f38-8370acc89497",
    description: "ID du niveau de sensibilité",
  })
  @IsString()
  @IsOptional()
  sensibilityId?: string;

  @ApiPropertyOptional({
    example: "5708d232-8338-4abf-8f38-8370acc89497",
    description: "ID de la famille thématique",
  })
  @IsString()
  @IsOptional()
  familyId?: string;

  @ApiPropertyOptional({
    example: "5708d232-8338-4abf-8f38-8370acc89497",
    description: "ID de la fréquence de mise à jour",
  })
  @IsString()
  @IsOptional()
  updateFrequencyId?: string;
}
