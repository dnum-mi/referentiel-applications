import { ApiProperty } from "@nestjs/swagger";

export class AppPermsMatrixHistoryDto {
  @ApiProperty({ description: "ID unique de l'entrée d'historique" })
  id: string;

  @ApiProperty({ description: "Date de la modification" })
  createdAt: Date;

  @ApiProperty({
    description:
      "Détail des changements de droits appliqués à la matrice, par type d'acteur",
  })
  description: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description:
      "Email de la personne ayant effectué la modification. Null si l'auteur a depuis été supprimé.",
  })
  changedByEmail: string | null;
}
