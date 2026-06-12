import { ApiProperty } from "@nestjs/swagger";

export class MaiaOrganizationSuggestionDto {
  @ApiProperty({
    description: "ID de l'organisation correspondante dans le référentiel",
    nullable: true,
  })
  organizationId: string | null;

  @ApiProperty({
    description: "Chemin de l'organisation proposée par MAIA",
    example: "MINISTERE/DIRECTION/SERVICE",
    nullable: true,
  })
  organizationPath: string | null;

  @ApiProperty({ description: "Prénom récupéré depuis MAIA" })
  firstName: string;

  @ApiProperty({ description: "Nom récupéré depuis MAIA" })
  lastName: string;

  @ApiProperty({ description: "Nom complet récupéré depuis MAIA" })
  fullName: string;
}
