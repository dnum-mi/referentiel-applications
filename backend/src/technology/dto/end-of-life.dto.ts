import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TechnologyEolSource } from "@prisma/client";
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
} from "class-validator";
import { PaginationDto } from "src/common/dto";
import {
  EOL_STATUS_FILTERS,
  EOL_STATUSES,
  type EolStatus,
  type EolStatusFilter,
} from "../utils/eol-status";

/** Filtres de la vue transverse des fins de vie (#2236). */
export class EndOfLifeFiltersDto extends PaginationDto {
  @ApiPropertyOptional({
    description:
      "Ne retenir que les technologies portant ce statut de fin de vie. Les trois statuts partitionnent la liste : une technologie déjà en fin de vie n'apparaît pas sous « fin de support actif ». `all` est un 4ᵉ filtre, non partitionnant : il lève la restriction et retourne aussi les technologies saines.",
    enum: EOL_STATUS_FILTERS,
  })
  @IsOptional()
  @IsIn(EOL_STATUS_FILTERS as unknown as string[])
  status?: EolStatusFilter;

  @ApiPropertyOptional({
    description:
      "Filtre sur l'organisation d'un acteur de l'application : chemin ou sigle, en correspondance partielle et insensible à la casse. Un chemin de direction ramène donc aussi ses organisations filles.",
    example: "MI/DNUM",
  })
  @IsOptional()
  @IsString()
  organization?: string;

  @ApiPropertyOptional({
    description:
      "Recherche libre sur le libellé de l'application ou le produit concerné (ex. « PostgreSQL »)",
  })
  @IsOptional()
  @IsString()
  search?: string;
}

/** Technologie en fin de vie, telle que restituée par la vue transverse. */
export class EndOfLifeTechnologyDto {
  @ApiProperty({ example: "12345678-1234-1234-1234-123456789012" })
  @IsString()
  id: string;

  @ApiProperty({ example: "Base de données" })
  @IsString()
  technology: string;

  @ApiProperty({ example: "PostgreSQL" })
  @IsString()
  product: string;

  @ApiProperty({ example: "13", required: false, nullable: true })
  @IsOptional()
  @IsString()
  version?: string | null;

  @ApiProperty({
    type: String,
    format: "date-time",
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  eolDate?: string | null;

  @ApiProperty({
    type: String,
    format: "date-time",
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsDateString()
  eoasDate?: string | null;

  @ApiProperty({ example: "15.5", required: false, nullable: true })
  @IsOptional()
  @IsString()
  latestVersion?: string | null;

  @ApiProperty({
    description:
      "Origine de la date : calculée via endoflife.date, ou saisie à la main quand endoflife.date ne pouvait pas répondre (#2454).",
    enum: TechnologyEolSource,
    enumName: "TechnologyEolSource",
  })
  @IsEnum(TechnologyEolSource)
  eolSource: TechnologyEolSource;

  @ApiProperty({
    description:
      "Statut calculé côté serveur, pour que la fiche et la vue transverse classent une technologie de la même façon. null si la technologie ne présente aucune fin de vie connue (restitué uniquement avec le filtre `all`).",
    enum: EOL_STATUSES,
    nullable: true,
  })
  @IsOptional()
  @IsIn(EOL_STATUSES as unknown as string[])
  status: EolStatus | null;
}

/** Application concernée par au moins une technologie en fin de vie. */
export class EndOfLifeApplicationDto {
  @ApiProperty({ example: "12345678-1234-1234-1234-123456789012" })
  @IsString()
  id: string;

  @ApiProperty({ example: "Référentiel des applications" })
  @IsString()
  label: string;

  @ApiProperty({ example: "REFAPP", required: false, nullable: true })
  @IsOptional()
  @IsString()
  shortName?: string | null;

  @ApiProperty({
    description:
      "Organisations des acteurs de l'application, dédoublonnées et triées — le rattachement d'une application se lit par ses acteurs, elle n'en porte pas en propre.",
    type: [String],
    example: ["MI/DNUM/SDIT"],
  })
  @IsString({ each: true })
  organizationPaths: string[];

  @ApiProperty({
    description:
      "Les technologies retenues par le filtre, triées par gravité décroissante. Avec le filtre `all`, ce sont TOUTES les technologies de l'application, pas seulement celles concernées par une fin de vie.",
    type: [EndOfLifeTechnologyDto],
  })
  technologies: EndOfLifeTechnologyDto[];

  @ApiProperty({
    description:
      "Statut le plus grave parmi les technologies retenues — sert au tri et à la pastille de synthèse. null si aucune des technologies retenues n'a de fin de vie connue (n'arrive qu'avec le filtre `all`).",
    enum: EOL_STATUSES,
    nullable: true,
  })
  @IsOptional()
  @IsIn(EOL_STATUSES as unknown as string[])
  worstStatus: EolStatus | null;
}
