import { ApiProperty } from "@nestjs/swagger";

export class GristRecordDto {
  @ApiProperty({ description: "Identifiant de la ligne dans Grist" })
  rowId: number;

  @ApiProperty({ description: "Identifiant de l'application dans RefApp" })
  refapp_id: string;

  @ApiProperty({
    type: "object",
    additionalProperties: true,
    description:
      "Valeurs des colonnes écrites par RefApp présentes dans la table (iq, nom, statut…), par identifiant de colonne",
  })
  values: Record<string, unknown>;

  @ApiProperty({
    type: "object",
    additionalProperties: true,
    description:
      "Métadonnées : valeurs des colonnes de données ajoutées dans Grist, par identifiant de colonne",
  })
  metadata: Record<string, unknown>;
}
