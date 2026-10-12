import { ApiProperty } from "@nestjs/swagger";

export class GristDocumentReportDto {
  @ApiProperty({ description: "Identifiant du document Grist" })
  docId: string;

  @ApiProperty({
    enum: ["ok", "error"],
    enumName: "GristDocumentSyncStatus",
    description: "Résultat de la synchronisation de ce document",
  })
  status: "ok" | "error";

  @ApiProperty({
    required: false,
    description: "Message d'erreur si la synchronisation a échoué",
  })
  error?: string;

  @ApiProperty({
    required: false,
    description: "Table synchronisée : RefApp, RefApp2, RefApp3…",
  })
  tableId?: string;

  @ApiProperty({
    required: false,
    description: "La table a été créée par cet appel",
  })
  tableCreated?: boolean;

  @ApiProperty({
    required: false,
    description: "Nombre d'applications écrites (créées ou mises à jour)",
  })
  rowsWritten?: number;

  @ApiProperty({
    required: false,
    description:
      "Lignes hors sélection conservées et grisées car elles portent des métadonnées",
  })
  rowsGreyed?: number;

  @ApiProperty({
    required: false,
    description: "Lignes hors sélection supprimées car sans métadonnées",
  })
  rowsDeleted?: number;
}

export class GristSyncReportDto {
  @ApiProperty({
    type: GristDocumentReportDto,
    isArray: true,
    description: "Compte rendu de chaque document du profil, dans son ordre",
  })
  documents: GristDocumentReportDto[];
}
