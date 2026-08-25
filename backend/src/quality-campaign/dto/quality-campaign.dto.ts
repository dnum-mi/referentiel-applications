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
    enum: ["scheduled", "sent"],
    description:
      "« scheduled » tant que la campagne n'a pas été envoyée (date de début non atteinte, ou envoi manuel pas encore déclenché), « sent » une fois envoyée",
  })
  status: "scheduled" | "sent";

  @ApiProperty({ description: "Nombre d'applications ciblées par la campagne" })
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
