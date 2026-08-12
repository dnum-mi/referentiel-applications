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
  MaxLength,
  Min,
} from "class-validator";
import { PaginationDto } from "src/common/dto";
import { RelationTypeFilter } from "src/product/application/dto/relation-type.dto";
import { stringToBoolean } from "src/utils/functions";

/**
 * Critères de conformité filtrables. `pra` (Plan de Reprise d'Activité) s'appuie
 * sur le champ `dima_recovery_plan` de la conformité.
 */
export const COMPLIANCE_CRITERIA = [
  "dima",
  "pdma",
  "homologation",
  "rgaa",
  "dsfr",
  "rgpd",
  "pra",
] as const;

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
    description: "Recherche sur les labels et shortName",
    example: "Mon Application",
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description:
      "Recherche full-text sur l'ensemble des informations descriptives de la fiche " +
      "(libellé, nom court, description, finalités, populations cibles, tags, labels, acteurs). " +
      "Insensible à la casse et aux accents, avec lemmatisation française et tri par pertinence. " +
      "Tous les mots saisis doivent être présents (ET) ; la ponctuation est ignorée.",
    example: "gestion des factures",
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({
    description:
      "Recherche full-text en mode préfixe, pour l'autocomplétion au fil de la frappe " +
      "(chaque mot saisi est traité comme un préfixe). Même périmètre que `q`. " +
      "Prioritaire sur `q` s'il est fourni. Limité aux 200 résultats les plus pertinents.",
    example: "tow muel",
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  qPrefix?: string;

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
    description: "Filtrer les applications abonné",
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => stringToBoolean(value))
  @IsBoolean()
  subscribersEmail?: boolean;

  @ApiPropertyOptional({
    description: "Filtrer les applications par acteur et groupe acteurs",
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => stringToBoolean(value))
  @IsBoolean()
  myApplications?: boolean;

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
    description:
      "[Déprécié] Filtrer par conformité présente. Utiliser plutôt compliancePresent__in.",
    type: [String],
    enum: [...COMPLIANCE_CRITERIA],
    deprecated: true,
  })
  @IsOptional()
  @IsEnum([...COMPLIANCE_CRITERIA], { each: true })
  @Transform(({ value }) => ApplicationSearchDto.toArray(value))
  compliance__in?: string[];

  @ApiPropertyOptional({
    description:
      "Critères de conformité devant être présents (renseignés) sur l'application",
    type: [String],
    enum: [...COMPLIANCE_CRITERIA],
  })
  @IsOptional()
  @IsEnum([...COMPLIANCE_CRITERIA], { each: true })
  @Transform(({ value }) => ApplicationSearchDto.toArray(value))
  compliancePresent__in?: string[];

  @ApiPropertyOptional({
    description:
      "Critères de conformité absents : pour un critère booléen (pra, dsfr) = explicitement Non (false) ; pour les autres = non renseigné",
    type: [String],
    enum: [...COMPLIANCE_CRITERIA],
  })
  @IsOptional()
  @IsEnum([...COMPLIANCE_CRITERIA], { each: true })
  @Transform(({ value }) => ApplicationSearchDto.toArray(value))
  complianceAbsent__in?: string[];

  @ApiPropertyOptional({
    description:
      "Critères de conformité non renseignés (valeur nulle). Pertinent pour les critères booléens (pra, dsfr)",
    type: [String],
    enum: [...COMPLIANCE_CRITERIA],
  })
  @IsOptional()
  @IsEnum([...COMPLIANCE_CRITERIA], { each: true })
  @Transform(({ value }) => ApplicationSearchDto.toArray(value))
  complianceUnset__in?: string[];

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
    description:
      "Inclure les applications sans IQ (décommissionnées ou supprimées) en plus de celles dans la plage iqGte/iqLte",
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => stringToBoolean(value))
  @IsBoolean()
  iq__isNull?: boolean;

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
    description: "Filtrée sur la relation de type Utilise le SSO de",
    enum: ["NEUTRAL", "INCLUDE", "EXCLUDE"],
  })
  @IsOptional()
  @IsEnum(["NEUTRAL", "INCLUDE", "EXCLUDE"])
  use_sso_of?: RelationTypeFilter;

  @ApiPropertyOptional({
    description: "Filtrage des relations sur cette app",
  })
  @IsOptional()
  @IsString()
  relationAppId?: string;

  @ApiPropertyOptional({
    description: "Filtrage des directions de metier MOA (une ou plusieurs)",
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => ApplicationSearchDto.toArray(value))
  businessDivisionId?: string[];

  @ApiPropertyOptional({
    description: "Filtrée sur la mediation de service",
    enum: ["NEUTRAL", "INCLUDE", "EXCLUDE"],
  })
  @IsOptional()
  @IsEnum(["NEUTRAL", "INCLUDE", "EXCLUDE"])
  is_mediation_service?: RelationTypeFilter;

  @ApiPropertyOptional({
    description: "Recherche par nom de source de données",
  })
  @IsOptional()
  @IsString()
  dataSourceName?: string;

  @ApiPropertyOptional({
    description:
      "Millésime (année) de la campagne dette IT à présenter. " +
      "Par défaut, le millésime le plus récent disponible.",
    example: 2026,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(2000)
  @Max(2100)
  millesime?: number;
}
