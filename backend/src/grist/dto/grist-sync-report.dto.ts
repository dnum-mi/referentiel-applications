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
      "Lignes hors sélection conservées telles quelles car une colonne ajoutée dans Grist y a une valeur",
  })
  rowsKept?: number;

  @ApiProperty({
    required: false,
    description:
      "Lignes hors sélection supprimées car sans valeur dans les colonnes ajoutées dans Grist",
  })
  rowsDeleted?: number;

  @ApiProperty({
    required: false,
    type: [String],
    description:
      "Colonnes ajoutées à la table par cet appel (affichées dans la page de recherche mais absentes de la table)",
  })
  columnsAdded?: string[];

  @ApiProperty({
    required: false,
    type: [String],
    description:
      "Colonnes RefApp retirées de la table par cet appel (plus affichées dans la page de recherche, ou d'une version précédente)",
  })
  columnsRemoved?: string[];
}

export class GristSyncReportDto {
  @ApiProperty({
    type: GristDocumentReportDto,
    isArray: true,
    description: "Compte rendu de chaque document du profil, dans son ordre",
  })
  documents: GristDocumentReportDto[];
}
