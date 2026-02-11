import { ApiPropertyOptional } from "@nestjs/swagger";
import { priorityRestart, Status } from "@prisma/client";
import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { PaginationDto } from "src/common/dto";
import { RelationTypeFilter } from "src/product/application/dto/relation-type.dto";
import { stringToBoolean } from "src/utils/functions";

export class ApplicationSearchDto extends PaginationDto {
  private static toArray(value: unknown): string[] {
    if (value == null) return [];
    const raw = Array.isArray(value) ? value : [value];
    return raw
      .flatMap((v) => String(v).split(","))
      .map((v) => v.trim())
      .filter(Boolean);
  }

  @ApiPropertyOptional({
    description: "Recherche plein texte sur tous les champs",
    example: "Mon Application",
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: "Recherche par label",
    example: "Mon Application",
  })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ description: "Recherche par shortName" })
  @IsOptional()
  @IsString()
  shortName?: string;

  @ApiPropertyOptional({ description: "Filtrer par tags (un ou plusieurs)" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => ApplicationSearchDto.toArray(value))
  tag?: string[];

  @ApiPropertyOptional({
    description:
      "Filtrer par une ou plusieurs priorités de redémarrage (R0 à R3)",
    enum: priorityRestart,
    isArray: true,
    example: ["R1", "R2"],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(priorityRestart, { each: true })
  @Transform(({ value }) => ApplicationSearchDto.toArray(value))
  priorityRestart?: priorityRestart[];

  @ApiPropertyOptional({
    description: "Type d'acteur. Utiliser les valeurs de /actorTypes",
    example: "MOA",
  })
  @IsOptional()
  @IsString()
  actorType?: string;

  @ApiPropertyOptional({
    description: "Email d'un acteur pour filtrer les applications",
    example: "user@example.com",
  })
  @IsOptional()
  @IsString()
  actorEmail?: string;

  @ApiPropertyOptional({
    description: "Filtrer les applications sans MOA",
    example: true,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => stringToBoolean(value))
  @IsBoolean()
  missingMoa?: boolean;

  @ApiPropertyOptional({
    description: "Filtrer les applications sans MOE",
    example: true,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => stringToBoolean(value))
  @IsBoolean()
  missingMoe?: boolean;

  @ApiPropertyOptional({
    description: "Filtrer les applications sans hébergement",
    example: true,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => stringToBoolean(value))
  @IsBoolean()
  missingHosting?: boolean;

  @ApiPropertyOptional({
    type: [String],
    enum: Status,
    description: "Filtrer par un ou plusieurs status du statut courant",
  })
  @IsOptional()
  @IsEnum(Status, { each: true })
  @Transform(({ value }) => ApplicationSearchDto.toArray(value))
  currentStatus__in?: Status[];

  @ApiPropertyOptional({
    description: "Filtrer les applications sans statut",
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => stringToBoolean(value))
  @IsBoolean()
  currentStatus__isNull?: boolean;

  @ApiPropertyOptional({
    description: "Nom de l'organisation liée à l'application",
    example: "Direction des systèmes d'information",
  })
  @IsOptional()
  @IsString()
  organization?: string;

  @ApiPropertyOptional({
    description:
      "Recherche unifiée sur tous les champs d'hébergement (site, plateforme, fournisseur, bâtiment, salle)",
    example: "Paris",
  })
  @IsOptional()
  @IsString()
  hostingSearch?: string;

  @ApiPropertyOptional({
    description: "Filtrer par site d'hébergement",
    example: "Paris",
  })
  @IsOptional()
  @IsString()
  hostingSite?: string;

  @ApiPropertyOptional({
    description: "Filtrer par plateforme d'hébergement",
    example: "AWS",
  })
  @IsOptional()
  @IsString()
  hostingPlatform?: string;

  @ApiPropertyOptional({
    description: "Filtrer par fournisseur d'hébergement",
    example: "Amazon",
  })
  @IsOptional()
  @IsString()
  hostingProvider?: string;

  @ApiPropertyOptional({
    description: "Filtrer par bâtiment d'hébergement",
    example: "Bâtiment A",
  })
  @IsOptional()
  @IsString()
  hostingBuilding?: string;

  @ApiPropertyOptional({
    description: "Filtrer par pièce d'hébergement",
    example: "Salle 101",
  })
  @IsOptional()
  @IsString()
  hostingRoom?: string;

  @ApiPropertyOptional({
    description: "Filtrer par conformité",
    type: [String],
    enum: ["dima", "pdma", "homologation", "rgaa", "dsfr"],
  })
  @IsOptional()
  @IsEnum(["dima", "pdma", "homologation", "rgaa", "dsfr"], { each: true })
  @Transform(({ value }) => ApplicationSearchDto.toArray(value))
  compliance__in?: string[];

  @ApiPropertyOptional({
    description: "Recherche par lien (ressource externe)",
  })
  @IsOptional()
  @IsString()
  link?: string;

  @ApiPropertyOptional({
    description: "Recherche par indice de qualité minimum",
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  iqGte?: number = 0;

  @ApiPropertyOptional({
    description: "Recherche par indice de qualité maximum",
    default: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Max(100)
  iqLte?: number = 100;

  @ApiPropertyOptional({
    description: "Colonnes à inclure dans l'export",
    example: "id,label,shortName,description",
    type: "string",
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => {
    if (typeof value === "string") {
      // Try to parse if it's a JSON string
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [value];
      } catch {
        // If not valid JSON, treat as comma-separated values
        return value.split(",").map((v) => v.trim());
      }
    }
    return Array.isArray(value) ? value : ([value] as string[]);
  })
  columns?: string;

  @ApiPropertyOptional({
    description:
      "Ne retourne que les applications dont l'utilisateur est acteur, defaut: false",
    required: false,
    type: String,
  })
  @IsOptional()
  @Type(() => Boolean)
  isActor?: boolean = false;

  @ApiPropertyOptional({
    description: "Filtrée sur la relation de type Fait partie de",
    enum: ["NEUTRAL", "INCLUDE", "EXCLUDE"],
  })
  @IsOptional()
  @IsEnum(["NEUTRAL", "INCLUDE", "EXCLUDE"])
  is_part_of?: RelationTypeFilter;

  @ApiPropertyOptional({
    description: "Filtrée sur la relation de type Remplace",
    enum: ["NEUTRAL", "INCLUDE", "EXCLUDE"],
  })
  @IsOptional()
  @IsEnum(["NEUTRAL", "INCLUDE", "EXCLUDE"])
  in_replacement_of?: RelationTypeFilter;

  @ApiPropertyOptional({
    description: "Filtrée sur la relation de type Utilise le service de",
    enum: ["NEUTRAL", "INCLUDE", "EXCLUDE"],
  })
  @IsOptional()
  @IsEnum(["NEUTRAL", "INCLUDE", "EXCLUDE"])
  is_service_user_of?: RelationTypeFilter;

  @ApiPropertyOptional({
    description: "Filtrée sur la relation de type Utilise la donnée de",
    enum: ["NEUTRAL", "INCLUDE", "EXCLUDE"],
  })
  @IsOptional()
  @IsEnum(["NEUTRAL", "INCLUDE", "EXCLUDE"])
  is_data_user_of?: RelationTypeFilter;

  @ApiPropertyOptional({
    description: "Filtrage des relations sur cette app",
  })
  @IsOptional()
  @IsString()
  relationAppId?: string;
}
