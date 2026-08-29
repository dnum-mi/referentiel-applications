import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsDate,
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateQualityCampaignDto {
  @ApiProperty({
    description: "Nom donné à la campagne",
    maxLength: 150,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name: string;

  @ApiProperty({
    description:
      "Filtres de recherche d'applications définissant les cibles de la campagne (mêmes clés que la query de GET /applications)",
    type: Object,
  })
  @IsObject()
  filters: Record<string, unknown>;

  @ApiPropertyOptional({
    description:
      "Message incitatif inclus dans l'email de relance envoyé aux acteurs des applications ciblées",
    maxLength: 2000,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string | null;

  @ApiPropertyOptional({
    description:
      "Emails des sponsors (porteurs) de la campagne, destinataires des rapports de résultats",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsEmail({}, { each: true })
  sponsorEmails?: string[];

  @ApiProperty({
    description:
      "Date de démarrage de la campagne : déclenche l'envoi automatique aux acteurs",
  })
  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @ApiPropertyOptional({
    description: "Date de fin indicative de la campagne (affichage uniquement)",
    nullable: true,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date | null;
}

export class UpdateQualityCampaignDto extends PartialType(
  CreateQualityCampaignDto,
) {}
