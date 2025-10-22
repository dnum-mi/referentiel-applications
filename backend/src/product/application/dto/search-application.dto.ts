import { priorityRestart, Status } from "@prisma/client";
import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  Min,
  IsEnum,
  Max,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import { PaginationDto } from "../../../common/dto";

export class ApplicationSearchDto extends PaginationDto {
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
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
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
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
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
    type: [String],
    enum: Status,
    description: "Filtrer par un ou plusieurs status",
  })
  @IsOptional()
  @IsEnum(Status, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  status__in?: Status[];

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
      } catch (_e) {
        // If not valid JSON, treat as comma-separated values
        return value.split(",").map(v => v.trim());
      }
    }
    return Array.isArray(value) ? value : [value] as string[];
  })
  columns?: string;

  @ApiPropertyOptional({
    description: "Ne retourne que les applications dont l'utilisateur est acteur, defaut: false",
    required: false,
    type: String,
  })
  @IsOptional()
  @Type(() => Boolean)
  isActor?: boolean = false;
}
