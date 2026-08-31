import { ApiProperty } from "@nestjs/swagger";

export class QualityCampaignDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({
    description: "Filtres de recherche d'applications définissant les cibles",
    type: Object,
  })
  filters: Record<string, unknown>;

  @ApiProperty({ required: false, nullable: true })
  message: string | null;

  @ApiProperty({
    type: [String],
    description: "Emails des sponsors (porteurs) de la campagne",
  })
  sponsorEmails: string[];

  @ApiProperty()
  startDate: Date;

  @ApiProperty({ required: false, nullable: true })
  endDate: Date | null;

  @ApiProperty({ required: false, nullable: true })
  sentAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({
    enum: ["scheduled", "in_progress", "done"],
    description:
      "Statut librement modifiable par l'admin : « scheduled » (planifiée), « in_progress » (en cours), « done » (terminée). Avance automatiquement de « scheduled » à « in_progress » à l'envoi de la relance, mais reste corrigible manuellement dans n'importe quel sens.",
  })
  status: "scheduled" | "in_progress" | "done";

  @ApiProperty({
    description:
      "Nombre d'applications ciblées par la campagne. Avant l'envoi, calculé en direct depuis le filtre (la liste n'est figée qu'à l'envoi, pour capturer un IQ de départ fiable) ; après l'envoi, nombre d'applications réellement ciblées.",
  })
  targetCount: number;

  @ApiProperty({
    required: false,
    nullable: true,
    description: "IQ moyen des applications ciblées au moment de l'envoi",
  })
  averageIqAtStart: number | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description: "IQ moyen actuel des applications ciblées",
  })
  averageIqCurrent: number | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description: "Évolution moyenne de l'IQ depuis l'envoi de la campagne",
  })
  averageDelta: number | null;
}

export class QualityCampaignPreviewDto {
  @ApiProperty({
    description: "Nombre d'applications actuellement matchées par le filtre",
  })
  matchedCount: number;

  @ApiProperty({
    description: "IQ moyen actuel des applications matchées par le filtre",
  })
  averageIq: number;
}
