import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean } from "class-validator";

export class FeatureFlagDto {
  @ApiProperty({
    description: "Clé technique stable du flag",
    example: "fulltext-search",
  })
  key: string;

  @ApiProperty({
    description: "Libellé affiché dans l'admin",
    example: "Recherche full-text",
  })
  label: string;

  @ApiProperty({
    description: "Description de la fonctionnalité",
    example:
      "Active la recherche plein texte des applications (barre de recherche globale).",
    nullable: true,
    required: false,
  })
  description?: string | null;

  @ApiProperty({
    description: "État courant du flag",
    example: false,
  })
  enabled: boolean;

  @ApiProperty({
    description: "Date de dernière modification du flag",
    example: "2026-07-20T00:00:00.000Z",
    type: String,
  })
  updatedAt: Date;
}

export class UpdateFeatureFlagDto {
  @ApiProperty({
    description: "Nouvel état du flag",
    example: true,
  })
  @IsBoolean()
  enabled: boolean;
}
