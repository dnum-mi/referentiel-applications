import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean } from "class-validator";
import { FeatureFlagKey } from "../feature-flag.keys";

export class FeatureFlagDto {
  @ApiProperty({
    description: "Clé technique stable du flag",
    example: "fulltext-search",
    // Source unique des clés : l'enum est propagé au contrat OpenAPI puis au
    // client front généré — le front n'a AUCUN miroir manuel à maintenir.
    enum: Object.values(FeatureFlagKey),
    enumName: "FeatureFlagKey",
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
    format: "date-time",
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

/** Entrée du journal des bascules d'un flag (endpoint réservé à l'admin global). */
export class FeatureFlagLogDto {
  @ApiProperty({ description: "État APRÈS la bascule", example: false })
  enabled: boolean;

  @ApiProperty({
    description: "Date de la bascule",
    example: "2026-07-21T00:00:00.000Z",
    type: String,
    format: "date-time",
  })
  changedAt: Date;

  @ApiProperty({
    description:
      "Email de l'administrateur ayant basculé (null si le compte a été supprimé)",
    example: "admin@example.com",
    nullable: true,
    required: false,
  })
  changedByEmail?: string | null;
}
