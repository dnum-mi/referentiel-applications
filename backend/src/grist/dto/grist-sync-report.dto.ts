import { ApiProperty } from "@nestjs/swagger";

export class GristSyncReportDto {
  @ApiProperty({ description: "La table RefApp a été créée par cet appel" })
  tableCreated: boolean;

  @ApiProperty({
    description: "Nombre d'applications écrites (créées ou mises à jour)",
  })
  rowsWritten: number;

  @ApiProperty({
    description: "Nombre d'Access Rules ajoutées (0 si déjà présentes)",
  })
  rulesAdded: number;
}
