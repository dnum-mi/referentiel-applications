import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CorrelationSuggestionStatus } from "@prisma/client";
import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { ApplicationMinimalDto } from "src/applications/dto/get-application.dto";
import { PaginationDto } from "src/common/dto";

/** Détail des signaux ayant contribué au score d'une suggestion (#2284). */
export class CorrelationSignalsDto {
  @ApiProperty({
    description:
      "Similarité trigramme maximale entre les label/shortName [0..1]",
  })
  @IsNumber()
  nameSimilarity: number;

  @ApiProperty({ description: "Nombre de DataDescription partagées" })
  @IsNumber()
  sharedDataCount: number;

  @ApiProperty({
    description: "Nombre d'acteurs communs (même email) aux deux applications",
  })
  @IsNumber()
  sharedActorCount: number;
}

export class CorrelationSuggestionDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  applicationSourceId: string;

  @ApiProperty()
  @IsString()
  applicationTargetId: string;

  @ApiProperty({ type: ApplicationMinimalDto })
  sourceApplication: ApplicationMinimalDto;

  @ApiProperty({ type: ApplicationMinimalDto })
  targetApplication: ApplicationMinimalDto;

  @ApiProperty({
    description: "Score pondéré de la suggestion (plus élevé = plus probable)",
  })
  @IsNumber()
  score: number;

  @ApiProperty({ type: CorrelationSignalsDto })
  signals: CorrelationSignalsDto;

  @ApiProperty({
    enum: CorrelationSuggestionStatus,
    enumName: "CorrelationSuggestionStatus",
  })
  @IsEnum(CorrelationSuggestionStatus)
  status: CorrelationSuggestionStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: String, nullable: true })
  @IsOptional()
  reviewedById: string | null;

  @ApiProperty({ type: Date, nullable: true })
  @IsOptional()
  reviewedAt: Date | null;
}

export class CorrelationSuggestionFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: CorrelationSuggestionStatus,
    enumName: "CorrelationSuggestionStatus",
    description: "Filtre par statut de revue",
  })
  @IsOptional()
  @IsEnum(CorrelationSuggestionStatus)
  status?: CorrelationSuggestionStatus;
}
