import { ApiProperty } from "@nestjs/swagger";

export type ImportRowStatus = "created" | "updated" | "error";

export class ImportReportEntryDto {
  @ApiProperty({
    description: "Nom de l'onglet traité",
    example: "Acteurs",
  })
  sheet: string;

  @ApiProperty({
    description: "Numéro de la ligne dans l'onglet (1 = en-tête)",
    example: 4,
  })
  row: number;

  @ApiProperty({
    description: "Résultat du traitement de la ligne",
    enum: ["created", "updated", "error"],
    example: "updated",
  })
  status: ImportRowStatus;

  @ApiProperty({
    description: "Identifiant lisible de l'enregistrement concerné",
    required: false,
    example: "MOA : jean.dupont@example.com",
  })
  identifier?: string;

  @ApiProperty({
    description: "Détail (motif d'erreur ou information)",
    required: false,
    example: "Type d'acteur introuvable pour le rôle « XYZ »",
  })
  message?: string;
}

export class ImportReportSummaryDto {
  @ApiProperty({ description: "Onglets effectivement traités", type: [String] })
  processedSheets: string[];

  @ApiProperty({
    description: "Onglets ignorés (absents ou non reconnus)",
    type: [String],
  })
  ignoredSheets: string[];

  @ApiProperty({ description: "Nombre d'enregistrements créés" })
  created: number;

  @ApiProperty({ description: "Nombre d'enregistrements mis à jour" })
  updated: number;

  @ApiProperty({ description: "Nombre de lignes en erreur" })
  errors: number;
}

export class ImportReportDto {
  @ApiProperty({ type: ImportReportSummaryDto })
  summary: ImportReportSummaryDto;

  @ApiProperty({ type: [ImportReportEntryDto] })
  entries: ImportReportEntryDto[];

  @ApiProperty({
    description: "Journal d'exécution (erreurs au niveau onglet, etc.)",
    type: [String],
  })
  logs: string[];
}
