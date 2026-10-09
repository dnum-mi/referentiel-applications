import { ApiProperty } from "@nestjs/swagger";

export class GristRecordDto {
  @ApiProperty({ description: "Identifiant de la ligne dans Grist" })
  rowId: number;

  @ApiProperty({ description: "Identifiant de l'application dans RefApp" })
  refapp_id: string;

  @ApiProperty({ description: "Nom de l'application" })
  nom: string;

  @ApiProperty({ description: "Statut courant de l'application" })
  statut: string;

  @ApiProperty({
    nullable: true,
    type: String,
    description: "Saisie libre dans Grist",
  })
  metadata_1: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    description: "Saisie libre dans Grist",
  })
  metadata_2: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    description: "Saisie libre dans Grist",
  })
  metadata_3: string | null;
}
